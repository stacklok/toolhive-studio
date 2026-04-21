import { useRef, useState, useCallback, useLayoutEffect } from 'react'
import { useElementScrollRestoration } from '@tanstack/react-router'

export const CHAT_SCROLL_RESTORATION_ID = 'chat-messages'

interface UseAutoScrollOptions {
  threadId: string | null | undefined
  isStreaming: boolean
  hasContent: boolean
}

interface UseAutoScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  showScrollToBottom: boolean
  scrollToBottom: () => void
}

const NEAR_BOTTOM_THRESHOLD_PX = 50

// Safety cap for re-applying the placement target while MCP iframes / images
// finish their async size handshake. Pathologically slow content falls out
// of settling and the user can scroll manually.
const PLACEMENT_SETTLING_MS = 5000

type PlacementTarget = number | 'bottom' | null

function isNearBottom(el: HTMLDivElement) {
  return (
    el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_THRESHOLD_PX
  )
}

export function useAutoScroll({
  threadId,
  isStreaming,
  hasContent,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isProgrammaticScrollRef = useRef(false)

  const userIsNearBottomRef = useRef(true)
  const [userIsNearBottom, setUserIsNearBottom] = useState(true)

  const showScrollToBottom = !userIsNearBottom && hasContent

  const savedScroll = useElementScrollRestoration({
    id: CHAT_SCROLL_RESTORATION_ID,
    getKey: (location) => location.pathname,
  })

  const placementTargetRef = useRef<PlacementTarget>(null)
  const settlingDeadlineRef = useRef<number>(0)
  // Timestamp of the last genuine user input — used to tell real scrolls
  // apart from `overflow-anchor`-driven ones during the settling window.
  const lastUserInputAtRef = useRef<number>(0)

  const applyPlacementTarget = useCallback((el: HTMLDivElement) => {
    const target = placementTargetRef.current
    if (target === null) return

    // If the saved scrollY doesn't fit yet (iframes still loading), pin to
    // the current bottom and keep the target so the next resize re-tries.
    // Once it fits, snap exactly and clear so later resizes don't yank us.
    const maxScrollY = Math.max(0, el.scrollHeight - el.clientHeight)
    const fits = target !== 'bottom' && target <= maxScrollY
    const top = fits ? target : el.scrollHeight

    isProgrammaticScrollRef.current = true
    el.scrollTo({ top, behavior: 'instant' })
    isProgrammaticScrollRef.current = false

    if (fits) placementTargetRef.current = null
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    userIsNearBottomRef.current = true
    setUserIsNearBottom(true)
    isProgrammaticScrollRef.current = true
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    // Unlocks in the scroll listener when we arrive near the bottom.
  }, [])

  // Registered before the placement effect so our programmatic scrolls hit
  // this listener and don't get misread as user scrolls.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const markUserInput = () => {
      lastUserInputAtRef.current = performance.now()
    }

    const onScroll = () => {
      const nearBottom = isNearBottom(container)

      if (isProgrammaticScrollRef.current) {
        if (nearBottom) isProgrammaticScrollRef.current = false
        return
      }

      // Ignore `overflow-anchor`-driven scrolls during settling; otherwise
      // the first iframe resize would cancel placement.
      const now = performance.now()
      const settlingActive =
        placementTargetRef.current !== null &&
        now <= settlingDeadlineRef.current
      const recentUserInput = now - lastUserInputAtRef.current < 500
      if (settlingActive && !recentUserInput) return

      settlingDeadlineRef.current = 0
      placementTargetRef.current = null

      userIsNearBottomRef.current = nearBottom
      if (hasContent) setUserIsNearBottom(nearBottom)
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    container.addEventListener('wheel', markUserInput, { passive: true })
    container.addEventListener('touchstart', markUserInput, { passive: true })
    container.addEventListener('keydown', markUserInput)
    container.addEventListener('pointerdown', markUserInput)
    return () => {
      container.removeEventListener('scroll', onScroll)
      container.removeEventListener('wheel', markUserInput)
      container.removeEventListener('touchstart', markUserInput)
      container.removeEventListener('keydown', markUserInput)
      container.removeEventListener('pointerdown', markUserInput)
    }
  }, [hasContent])

  // Initial placement per thread. `useChat` briefly resets messages on
  // thread switch, flipping `hasContent` false — clear the guard so the
  // re-hydrated render re-runs placement.
  const placedForThreadRef = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (!threadId) return
    if (!hasContent) {
      if (placedForThreadRef.current === threadId) {
        placedForThreadRef.current = null
      }
      return
    }

    const el = containerRef.current
    if (!el) return
    if (placedForThreadRef.current === threadId) return
    placedForThreadRef.current = threadId

    placementTargetRef.current =
      savedScroll && savedScroll.scrollY > 0 ? savedScroll.scrollY : 'bottom'
    settlingDeadlineRef.current = performance.now() + PLACEMENT_SETTLING_MS

    applyPlacementTarget(el)
    const nearBottom = isNearBottom(el)
    userIsNearBottomRef.current = nearBottom
    setUserIsNearBottom(nearBottom)
  }, [threadId, hasContent, savedScroll, applyPlacementTarget])

  // One ResizeObserver, two modes:
  // - streaming: follow the bottom if user was already near it;
  // - placement window: re-apply the target as MCP iframes grow the DOM.
  useLayoutEffect(() => {
    if (!threadId || !hasContent) return
    const container = containerRef.current
    if (!container) return
    const inner = container.firstElementChild
    if (!inner) return

    const observer = new ResizeObserver(() => {
      if (isStreaming) {
        if (userIsNearBottomRef.current) scrollToBottom()
        return
      }
      if (performance.now() > settlingDeadlineRef.current) return
      applyPlacementTarget(container)
    })
    observer.observe(inner)
    return () => observer.disconnect()
  }, [threadId, hasContent, isStreaming, applyPlacementTarget, scrollToBottom])

  return {
    containerRef,
    showScrollToBottom,
    scrollToBottom,
  }
}
