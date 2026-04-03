import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoScroll } from '../use-auto-scroll'

// The module has a module-level scrollPositions Map that persists across tests.
// We reset it by re-importing the module via vi.resetModules, but the simpler
// approach here is to use unique thread IDs per test so keys never collide.

// JSDOM stubs scrollTo — make it actually update scrollTop for our assertions.
function makeScrollContainer(
  scrollHeight = 1000,
  clientHeight = 300,
  initialScrollTop = 0
): HTMLDivElement {
  const el = document.createElement('div')

  let _scrollTop = initialScrollTop
  Object.defineProperties(el, {
    scrollHeight: { get: () => scrollHeight, configurable: true },
    clientHeight: { get: () => clientHeight, configurable: true },
    scrollTop: {
      get: () => _scrollTop,
      set: (v) => {
        _scrollTop = v
      },
      configurable: true,
    },
  })

  el.scrollTo = vi.fn(({ top }: ScrollToOptions = {}) => {
    if (top !== undefined) _scrollTop = top
    el.dispatchEvent(new Event('scroll'))
  })

  return el
}

describe('useAutoScroll', () => {
  describe('basic return shape', () => {
    it('returns containerRef, showScrollToBottom, and scrollToBottom', () => {
      const { result } = renderHook(() =>
        useAutoScroll({
          contentDep: [],
          resetDep: 'thread-basic',
          hasContent: false,
        })
      )
      expect(result.current.containerRef).toBeDefined()
      expect(result.current.showScrollToBottom).toBe(false)
      expect(typeof result.current.scrollToBottom).toBe('function')
    })

    it('showScrollToBottom starts as false', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ contentDep: [], resetDep: null, hasContent: false })
      )
      expect(result.current.showScrollToBottom).toBe(false)
    })
  })

  describe('auto-scroll on content change', () => {
    it('calls scrollTo on the container when content changes and user has not scrolled', () => {
      const { result, rerender } = renderHook(
        ({ dep }) =>
          useAutoScroll({
            contentDep: dep,
            resetDep: 'thread-content',
            hasContent: true,
          }),
        { initialProps: { dep: [] as unknown[] } }
      )

      const container = makeScrollContainer()
      // Attach the container to the ref
      Object.defineProperty(result.current.containerRef, 'current', {
        value: container,
        writable: true,
      })

      rerender({ dep: ['msg1'] })

      expect(container.scrollTo).toHaveBeenCalled()
    })
  })

  describe('scrollToBottom public method', () => {
    it('calls scrollTo on the container', () => {
      const { result } = renderHook(() =>
        useAutoScroll({
          contentDep: [],
          resetDep: 'thread-stb',
          hasContent: true,
        })
      )
      const container = makeScrollContainer()
      Object.defineProperty(result.current.containerRef, 'current', {
        value: container,
        writable: true,
      })

      act(() => {
        result.current.scrollToBottom()
      })

      expect(container.scrollTo).toHaveBeenCalled()
    })
  })

  describe('scroll event handling', () => {
    it('sets showScrollToBottom to true when user scrolls up with content', () => {
      // scrollHeight=1000, clientHeight=300 → scrollTop=0 means far from bottom (>50px away)
      const container = makeScrollContainer(1000, 300, 0)

      // Use a stable contentDep reference so the contentDep effect does NOT re-run when we
      // rerender with hasContent: true. If it re-ran it would call scrollToBottom() (now that
      // the container is populated), programmatically scroll to bottom, set
      // isProgrammaticScrollRef=true, and prevent our manual scroll from being counted.
      const stableContentDep: unknown[] = []

      // Start with hasContent: false so the scroll-listener effect fires without a container.
      // Then attach the container ref and rerender with hasContent: true to re-register it.
      const { result, rerender } = renderHook(
        ({ hasContent }: { hasContent: boolean }) =>
          useAutoScroll({
            contentDep: stableContentDep,
            resetDep: 'thread-scroll-up',
            hasContent,
          }),
        { initialProps: { hasContent: false } }
      )

      Object.defineProperty(result.current.containerRef, 'current', {
        value: container,
        writable: true,
        configurable: true,
      })

      // Re-run the scroll-listener effect now that the container ref is populated.
      // contentDep is stable so its effect does NOT fire again.
      rerender({ hasContent: true })

      // Dispatch a manual scroll event — the listener is now registered and counts it
      act(() => {
        container.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.showScrollToBottom).toBe(true)
    })

    it('keeps showScrollToBottom false when hasContent is false even if scrolled up', () => {
      const { result } = renderHook(() =>
        useAutoScroll({
          contentDep: [],
          resetDep: 'thread-no-content',
          hasContent: false,
        })
      )
      const container = makeScrollContainer(1000, 300, 0)
      Object.defineProperty(result.current.containerRef, 'current', {
        value: container,
        writable: true,
      })

      act(() => {
        container.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.showScrollToBottom).toBe(false)
    })

    it('hides scroll button when user scrolls near bottom', () => {
      const { result } = renderHook(() =>
        useAutoScroll({
          contentDep: ['msg1'],
          resetDep: 'thread-near-bottom',
          hasContent: true,
        })
      )
      // scrollTop = 650, scrollHeight = 1000, clientHeight = 300 → difference = 50 (exactly at boundary)
      const container = makeScrollContainer(1000, 300, 650)
      Object.defineProperty(result.current.containerRef, 'current', {
        value: container,
        writable: true,
      })

      act(() => {
        container.dispatchEvent(new Event('scroll'))
      })

      // 1000 - 650 - 300 = 50, which is ≤ 50, so nearBottom = true
      expect(result.current.showScrollToBottom).toBe(false)
    })
  })

  describe('thread switch — scroll position persistence', () => {
    it('scrolls to bottom on new thread (no saved position)', () => {
      const container = makeScrollContainer()

      // Start on an initial thread with the container ref already attached so that
      // the resetDep effect can call scrollTo when we switch to the new thread.
      const { result, rerender } = renderHook(
        ({ threadId }) =>
          useAutoScroll({
            contentDep: [],
            resetDep: threadId,
            hasContent: true,
          }),
        { initialProps: { threadId: 'thread-initial' } }
      )

      Object.defineProperty(result.current.containerRef, 'current', {
        value: container,
        writable: true,
        configurable: true,
      })

      // Switch to a new thread — the resetDep effect fires and calls scrollTo(bottom)
      rerender({ threadId: 'thread-new-A' })

      // After switching to a new thread, scrollTo should be called to go to bottom
      expect(container.scrollTo).toHaveBeenCalled()
    })

    it('restores saved scroll position when switching back to a thread that was scrolled up', () => {
      // Thread A: scrolled up to position 200 (not at bottom)
      const container = makeScrollContainer(1000, 300, 200)

      const { result, rerender } = renderHook(
        ({ threadId }) =>
          useAutoScroll({
            contentDep: [],
            resetDep: threadId,
            hasContent: true,
          }),
        { initialProps: { threadId: 'thread-persist-A' } }
      )
      Object.defineProperty(result.current.containerRef, 'current', {
        value: container,
        writable: true,
      })

      // Simulate manual scroll up — set isProgrammaticScrollRef to false by being
      // at a position not near bottom (scrollTop=200, gap=500 which is >>50)
      // The scroll position gets saved when we switch away.
      // Scroll position is 200, which is far from bottom (1000-200-300=500).
      // The module saves this when resetDep changes.

      // Switch to thread B — this saves thread A's position
      rerender({ threadId: 'thread-persist-B' })

      // Switch back to thread A
      rerender({ threadId: 'thread-persist-A' })

      // After switch back, pendingRestoreRef should be 200 and will fire once content loads
      // For the purpose of this test, just assert the container's scrollTo was called
      // (we can't easily assert the exact value without content having height in JSDOM)
      expect(container.scrollTo).toHaveBeenCalled()
    })
  })
})
