import { useRef, useState, useCallback, useLayoutEffect } from 'react'

interface UseAutoScrollOptions {
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
  resetDep,
  hasContent,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const userScrolledRef = useRef(false)
  const isProgrammaticScrollRef = useRef(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  /** Tracks the outgoing thread ID so we can save its position on switch. */
  const prevResetDepRef = useRef<string | null | undefined>(resetDep)

  const scrollToBottom = useCallback((instant = false) => {
    const el = containerRef.current
    if (!el) return
    userScrolledRef.current = false
    isProgrammaticScrollRef.current = true
    el.scrollTo({
      top: el.scrollHeight,
      behavior: instant ? 'auto' : 'smooth',
    })
  }, [])

  // Effect 1: Thread switch — save outgoing position, restore or scroll-to-bottom for incoming.
  // The scroll container is always in the DOM (never conditionally unmounted), so
  // containerRef.current is valid and the restore can happen immediately with no deferred logic.
  useLayoutEffect(() => {
    const el = containerRef.current

    // Save outgoing thread's scroll position
    if (el && prevResetDepRef.current != null) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 50
      scrollPositions.set(String(prevResetDepRef.current), {
        scrollTop: el.scrollTop,
        atBottom,
      })
    }
    prevResetDepRef.current = resetDep

    // Restore incoming thread or scroll to bottom
    const saved =
      resetDep != null ? scrollPositions.get(String(resetDep)) : undefined

    if (saved && !saved.atBottom && el) {
      userScrolledRef.current = true
      el.scrollTo({ top: saved.scrollTop, behavior: 'auto' })
      // Measuring the DOM to set state before paint is the intended use of useLayoutEffect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowScrollToBottom(true)
    } else {
      userScrolledRef.current = false
      setShowScrollToBottom(false)
      scrollToBottom(true)
    }
  }, [resetDep, scrollToBottom])

  // Effect 2: Scroll listener + ResizeObserver.
  // Re-registers when hasContent changes (scroll container may have new inner content node).
  // onScroll drives the show/hide of the scroll-to-bottom button.
  // ResizeObserver drives auto-scroll during streaming and after images/code blocks load.
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

    // Re-scroll when content height grows (streaming tokens, images, code blocks).
    const innerContent = container.firstElementChild
    let resizeObserver: ResizeObserver | null = null
    if (innerContent) {
      resizeObserver = new ResizeObserver(() => {
        if (!userScrolledRef.current) {
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
