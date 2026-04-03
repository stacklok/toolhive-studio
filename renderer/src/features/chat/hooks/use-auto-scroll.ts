import { useRef, useState, useCallback, useLayoutEffect } from 'react'

interface UseAutoScrollOptions {
  /** Changes on every content update (e.g. messages array ref from useChat) */
  contentDep: unknown
  /** Thread ID — when this changes, save the outgoing position and restore the incoming one */
  resetDep: string | null | undefined
  /** Whether there is any scrollable content */
  hasContent: boolean
}

interface UseAutoScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>
  showScrollToBottom: boolean
  scrollToBottom: () => void
}

/** Module-level map so positions persist across re-renders and thread switches for the session. */
const scrollPositions = new Map<
  string,
  { scrollTop: number; atBottom: boolean }
>()

export function useAutoScroll({
  contentDep,
  resetDep,
  hasContent,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const userScrolledRef = useRef(false)
  const isProgrammaticScrollRef = useRef(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  /** Tracks the outgoing thread ID so we can save its position on switch. */
  const prevResetDepRef = useRef<string | null | undefined>(resetDep)
  /** Non-null when we need to restore a scroll position after messages load. */
  const pendingRestoreRef = useRef<number | null>(null)

  const scrollToBottom = useCallback((instant = false) => {
    const el = containerRef.current
    if (!el) return
    userScrolledRef.current = false
    isProgrammaticScrollRef.current = true
    el.scrollTo({
      top: el.scrollHeight,
      behavior: instant ? 'instant' : 'smooth',
    })
  }, [])

  // Auto-scroll on every content change (fires on each streaming token).
  // Also handles pending restore: if messages loaded asynchronously after thread
  // switch, apply the saved scrollTop once the container has real height.
  useLayoutEffect(() => {
    if (pendingRestoreRef.current !== null) {
      const el = containerRef.current
      if (el && el.scrollHeight > el.clientHeight) {
        el.scrollTo({ top: pendingRestoreRef.current, behavior: 'instant' })
        pendingRestoreRef.current = null
      }
      return
    }
    if (!userScrolledRef.current) {
      scrollToBottom()
    }
  }, [contentDep, scrollToBottom])

  // On thread switch: save the outgoing thread's scroll position, then either
  // queue a restore for the incoming thread or scroll to bottom.
  useLayoutEffect(() => {
    const el = containerRef.current

    // Save position of outgoing thread
    if (el && prevResetDepRef.current != null) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 50
      scrollPositions.set(String(prevResetDepRef.current), {
        scrollTop: el.scrollTop,
        atBottom,
      })
    }
    prevResetDepRef.current = resetDep

    // Restore or scroll-to-bottom for incoming thread
    const saved =
      resetDep != null ? scrollPositions.get(String(resetDep)) : undefined

    if (saved && !saved.atBottom) {
      // User was scrolled up — queue restore (messages may not be loaded yet).
      // showScrollToBottom will be set correctly by the onScroll handler once
      // the pending restore scroll fires.
      userScrolledRef.current = true
      pendingRestoreRef.current = saved.scrollTop
    } else {
      // At bottom or new thread — scroll to bottom as usual
      userScrolledRef.current = false
      pendingRestoreRef.current = null
      scrollToBottom(true)
    }
  }, [resetDep, scrollToBottom])

  // Track scroll position to gate auto-scroll and show the jump-to-bottom button.
  // Also observes the inner content for size changes so that content growing after
  // the initial scroll (e.g. images, syntax highlighting) re-targets the animation.
  // Re-registers when hasContent changes so the listener is active once messages appear.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const nearBottom = scrollHeight - scrollTop - clientHeight <= 50

      if (nearBottom) {
        // Smooth scroll animation settled at bottom — clear programmatic flag
        isProgrammaticScrollRef.current = false
      }

      // Ignore scroll events from our own programmatic scrollTo calls to avoid
      // falsely setting userScrolledRef=true mid-animation
      if (isProgrammaticScrollRef.current) return

      userScrolledRef.current = !nearBottom
      setShowScrollToBottom(!nearBottom && hasContent)
    }

    container.addEventListener('scroll', onScroll, { passive: true })

    // Re-scroll when content height grows (images/code blocks rendering after initial load).
    // Also handles pending restore for content that grows after the initial messages effect fires.
    const innerContent = container.firstElementChild
    let resizeObserver: ResizeObserver | null = null
    if (innerContent) {
      resizeObserver = new ResizeObserver(() => {
        if (pendingRestoreRef.current !== null) {
          container.scrollTo({
            top: pendingRestoreRef.current,
            behavior: 'instant',
          })
          pendingRestoreRef.current = null
        } else if (!userScrolledRef.current) {
          scrollToBottom()
        }
      })
      resizeObserver.observe(innerContent)
    }

    return () => {
      container.removeEventListener('scroll', onScroll)
      resizeObserver?.disconnect()
    }
  }, [hasContent, scrollToBottom])

  return {
    containerRef,
    showScrollToBottom,
    scrollToBottom: () => scrollToBottom(false),
  }
}
