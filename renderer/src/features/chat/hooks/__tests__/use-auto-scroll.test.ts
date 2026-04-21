import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// The hook reads TanStack Router's element-level scroll restoration entry.
// In isolation we don't have a router in the test tree, so stub the entry
// to undefined (simulating "no saved position"). Individual tests can
// override via `mockSavedScroll.value`.
const mockSavedScroll = { value: undefined as undefined | { scrollY: number } }
vi.mock('@tanstack/react-router', () => ({
  useElementScrollRestoration: () => mockSavedScroll.value,
}))

import { useAutoScroll } from '../use-auto-scroll'

// JSDOM stubs scrollTo — override it to actually update scrollTop and fire
// scroll events. Use unique thread IDs per test so the module-level
// "first-mount-per-thread" Set never collides.
function makeScrollContainer(
  scrollHeight = 1000,
  clientHeight = 300,
  initialScrollTop = 0
): HTMLDivElement {
  const el = document.createElement('div')

  let _scrollTop = initialScrollTop
  let _scrollHeight = scrollHeight
  Object.defineProperties(el, {
    scrollHeight: {
      get: () => _scrollHeight,
      // Tests simulate async iframe-size-handshake growth by writing to this.
      set: (v) => {
        _scrollHeight = v
      },
      configurable: true,
    },
    clientHeight: { get: () => clientHeight, configurable: true },
    scrollTop: {
      get: () => _scrollTop,
      set: (v) => {
        _scrollTop = v
      },
      configurable: true,
    },
  })

  el.scrollTo = vi.fn((...args: [ScrollToOptions] | [number, number]) => {
    const top = typeof args[0] === 'object' ? args[0].top : args[1]
    if (top !== undefined) {
      // Match real-browser clamping so the hook's landing check matches.
      const max = Math.max(0, _scrollHeight - clientHeight)
      _scrollTop = Math.min(max, Math.max(0, top))
    }
    el.dispatchEvent(new Event('scroll'))
  }) as HTMLDivElement['scrollTo']

  // The ResizeObserver branch observes the firstElementChild — give the
  // container one so the hook can hook into it.
  const inner = document.createElement('div')
  el.appendChild(inner)

  return el
}

// Capture ResizeObserver callbacks so tests can trigger a "content grew"
// event synchronously.
type ResizeCallback = ConstructorParameters<typeof ResizeObserver>[0]
let resizeCallbacks: ResizeCallback[] = []
beforeEach(() => {
  resizeCallbacks = []
  mockSavedScroll.value = undefined
  // jsdom lacks ResizeObserver — supply a minimal spy.
  globalThis.ResizeObserver = class {
    cb: ResizeCallback
    constructor(cb: ResizeCallback) {
      this.cb = cb
      resizeCallbacks.push(cb)
    }
    observe() {}
    unobserve() {}
    disconnect() {
      resizeCallbacks = resizeCallbacks.filter((c) => c !== this.cb)
    }
  } as unknown as typeof ResizeObserver
})

function attachContainer(
  ref: React.RefObject<HTMLDivElement | null>,
  container: HTMLDivElement
) {
  Object.defineProperty(ref, 'current', {
    value: container,
    writable: true,
    configurable: true,
  })
}

// `scrollHeight` is typed as read-only on HTMLElement, but our stub exposes
// it as a getter/setter so tests can simulate async iframe-driven growth.
function setScrollHeight(container: HTMLDivElement, value: number) {
  ;(container as unknown as { scrollHeight: number }).scrollHeight = value
}

// Simulate a genuine user scroll: the hook requires a recent user input
// event (wheel/touch/key/pointer) to differentiate real scrolls from
// `overflow-anchor`-driven ones during the placement settling window.
function fireUserScroll(container: HTMLDivElement) {
  container.dispatchEvent(new Event('wheel'))
  container.dispatchEvent(new Event('scroll'))
}

describe('useAutoScroll', () => {
  describe('basic return shape', () => {
    it('returns containerRef, showScrollToBottom, and scrollToBottom', () => {
      const { result } = renderHook(() =>
        useAutoScroll({
          threadId: 'thread-basic',
          isStreaming: false,
          hasContent: false,
        })
      )
      expect(result.current.containerRef).toBeDefined()
      expect(result.current.showScrollToBottom).toBe(false)
      expect(typeof result.current.scrollToBottom).toBe('function')
    })
  })

  describe('scrollToBottom public method', () => {
    it('calls scrollTo on the container', () => {
      const { result } = renderHook(() =>
        useAutoScroll({
          threadId: 'thread-stb',
          isStreaming: false,
          hasContent: true,
        })
      )
      const container = makeScrollContainer()
      attachContainer(result.current.containerRef, container)

      act(() => {
        result.current.scrollToBottom()
      })

      expect(container.scrollTo).toHaveBeenCalled()
    })
  })

  describe('scroll event handling', () => {
    it('sets showScrollToBottom to true when user scrolls up with content', () => {
      // scrollTop=0, 700px from bottom → listener should show the button
      const container = makeScrollContainer(1000, 300, 0)

      // Start hasContent:false so the listener effect runs but finds no container,
      // then attach the ref and flip to true to re-register with the real element.
      const { result, rerender } = renderHook(
        ({ hasContent }: { hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-scroll-up',
            isStreaming: false,
            hasContent,
          }),
        { initialProps: { hasContent: false } }
      )

      attachContainer(result.current.containerRef, container)
      rerender({ hasContent: true })

      // Placement effect lands us at the bottom (no saved scroll); simulate
      // the user scrolling back up, then fire the scroll listener.
      container.scrollTop = 0
      act(() => {
        fireUserScroll(container)
      })

      expect(result.current.showScrollToBottom).toBe(true)
    })

    it('keeps showScrollToBottom false when hasContent is false even if scrolled up', () => {
      const { result } = renderHook(() =>
        useAutoScroll({
          threadId: 'thread-no-content',
          isStreaming: false,
          hasContent: false,
        })
      )
      const container = makeScrollContainer(1000, 300, 0)
      attachContainer(result.current.containerRef, container)

      act(() => {
        container.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.showScrollToBottom).toBe(false)
    })

    it('hides scroll button when user scrolls near bottom', () => {
      const { result } = renderHook(() =>
        useAutoScroll({
          threadId: 'thread-near-bottom',
          isStreaming: false,
          hasContent: true,
        })
      )
      // 1000 - 650 - 300 = 50 ≤ 50, so nearBottom = true
      const container = makeScrollContainer(1000, 300, 650)
      attachContainer(result.current.containerRef, container)

      act(() => {
        container.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.showScrollToBottom).toBe(false)
    })
  })

  describe('follow-bottom while streaming', () => {
    it('scrolls to bottom when content grows and user is near the bottom', () => {
      const container = makeScrollContainer(1000, 300, 650)

      // Start with both effects short-circuited (no container yet), attach,
      // then flip deps so both the scroll listener and the ResizeObserver
      // re-register against the now-attached element.
      const { result, rerender } = renderHook(
        (props: { isStreaming: boolean; hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-follow-near',
            ...props,
          }),
        { initialProps: { isStreaming: false, hasContent: false } }
      )
      attachContainer(result.current.containerRef, container)
      rerender({ isStreaming: true, hasContent: true })
      ;(container.scrollTo as ReturnType<typeof vi.fn>).mockClear()

      // Sync userIsNearBottomRef to near-bottom via the scroll listener
      act(() => {
        container.dispatchEvent(new Event('scroll'))
      })

      act(() => {
        resizeCallbacks.forEach((cb) =>
          cb([] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
        )
      })

      expect(container.scrollTo).toHaveBeenCalled()
    })

    it('does NOT scroll to bottom when user has scrolled up', () => {
      const container = makeScrollContainer(1000, 300, 0)

      const { result, rerender } = renderHook(
        (props: { isStreaming: boolean; hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-follow-away',
            ...props,
          }),
        { initialProps: { isStreaming: false, hasContent: false } }
      )
      attachContainer(result.current.containerRef, container)
      rerender({ isStreaming: true, hasContent: true })

      // Placement lands us at the bottom; simulate the user scrolling up
      // so userIsNearBottomRef flips to false via the scroll listener.
      container.scrollTop = 0
      act(() => {
        fireUserScroll(container)
      })
      ;(container.scrollTo as ReturnType<typeof vi.fn>).mockClear()

      act(() => {
        resizeCallbacks.forEach((cb) =>
          cb([] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
        )
      })

      expect(container.scrollTo).not.toHaveBeenCalled()
    })

    it('does NOT observe content when isStreaming is false', () => {
      const container = makeScrollContainer(1000, 300, 650)

      const { result } = renderHook(() =>
        useAutoScroll({
          threadId: 'thread-no-stream',
          isStreaming: false,
          hasContent: true,
        })
      )
      attachContainer(result.current.containerRef, container)

      // Scroll listener should run, but ResizeObserver should NOT be attached
      expect(resizeCallbacks.length).toBe(0)
    })
  })

  describe('initial placement', () => {
    it('restores the TSR-saved scroll position on re-visit', () => {
      mockSavedScroll.value = { scrollY: 450 }
      const container = makeScrollContainer(1000, 300, 0)

      // Mount with no container → effect short-circuits, then attach +
      // flip hasContent to trigger the placement effect.
      const { result, rerender } = renderHook(
        ({ hasContent }: { hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-revisit',
            isStreaming: false,
            hasContent,
          }),
        { initialProps: { hasContent: false } }
      )
      attachContainer(result.current.containerRef, container)
      rerender({ hasContent: true })

      expect(container.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 450, behavior: 'instant' })
      )
    })

    it('scrolls to bottom when no saved scroll entry exists (first visit)', () => {
      mockSavedScroll.value = undefined
      const container = makeScrollContainer(1000, 300, 0)

      const { result, rerender } = renderHook(
        ({ hasContent }: { hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-first-visit',
            isStreaming: false,
            hasContent,
          }),
        { initialProps: { hasContent: false } }
      )
      attachContainer(result.current.containerRef, container)
      rerender({ hasContent: true })

      expect(container.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 1000 })
      )
    })

    it('treats scrollY=0 saved entry as "no saved position" (goes to bottom)', () => {
      mockSavedScroll.value = { scrollY: 0 }
      const container = makeScrollContainer(1000, 300, 0)

      const { result, rerender } = renderHook(
        ({ hasContent }: { hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-zero-y',
            isStreaming: false,
            hasContent,
          }),
        { initialProps: { hasContent: false } }
      )
      attachContainer(result.current.containerRef, container)
      rerender({ hasContent: true })

      expect(container.scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 1000 })
      )
    })

    it('does not re-place on later re-renders for the same thread', () => {
      mockSavedScroll.value = { scrollY: 450 }
      const container = makeScrollContainer(1000, 300, 0)

      const { result, rerender } = renderHook(
        ({ hasContent }: { hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-stable',
            isStreaming: false,
            hasContent,
          }),
        { initialProps: { hasContent: false } }
      )
      attachContainer(result.current.containerRef, container)
      rerender({ hasContent: true })

      const callsAfterPlacement = (
        container.scrollTo as ReturnType<typeof vi.fn>
      ).mock.calls.length

      // A subsequent re-render (e.g. new message arriving) must not
      // re-apply the saved position or yank the user around.
      rerender({ hasContent: true })

      expect(
        (container.scrollTo as ReturnType<typeof vi.fn>).mock.calls.length
      ).toBe(callsAfterPlacement)
    })
  })

  describe('settling window (async iframe size handshake)', () => {
    it('chases the growing bottom while saved scroll still clamps, then snaps and clears once it fits', () => {
      // Saved scroll was captured when the thread's full (iframe-expanded)
      // height was ~2500. On return, scrollHeight starts at 1000 (iframes
      // haven't loaded yet) so saved=2000 > max=700 → clamps.
      mockSavedScroll.value = { scrollY: 2000 }
      const container = makeScrollContainer(1000, 300, 0)

      const { result, rerender } = renderHook(
        ({ hasContent }: { hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-settle-chase',
            isStreaming: false,
            hasContent,
          }),
        { initialProps: { hasContent: false } }
      )
      attachContainer(result.current.containerRef, container)
      rerender({ hasContent: true })

      const scrollTo = container.scrollTo as ReturnType<typeof vi.fn>

      // Placement: target clamps → chase current bottom (scrollHeight=1000).
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 1000, behavior: 'instant' })
      )

      // First iframe finishes its handshake — scrollHeight grows to 1500
      // but saved=2000 still exceeds new max=1200 → keep chasing bottom.
      scrollTo.mockClear()
      setScrollHeight(container, 1500)
      act(() => {
        resizeCallbacks.forEach((cb) =>
          cb([] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
        )
      })
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 1500, behavior: 'instant' })
      )

      // Remaining iframes finish — scrollHeight=2800, max=2500, saved=2000
      // now fits → snap to saved position and clear the target.
      scrollTo.mockClear()
      setScrollHeight(container, 2800)
      act(() => {
        resizeCallbacks.forEach((cb) =>
          cb([] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
        )
      })
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 2000, behavior: 'instant' })
      )

      // Target is now cleared; a later resize must not yank the user.
      scrollTo.mockClear()
      setScrollHeight(container, 3500)
      act(() => {
        resizeCallbacks.forEach((cb) =>
          cb([] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
        )
      })
      expect(scrollTo).not.toHaveBeenCalled()
    })

    it('re-applies saved scroll on first resize when it fits but clears it afterwards', () => {
      mockSavedScroll.value = { scrollY: 450 }
      const container = makeScrollContainer(1000, 300, 0)

      const { result, rerender } = renderHook(
        ({ hasContent }: { hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-settle-saved-fits',
            isStreaming: false,
            hasContent,
          }),
        { initialProps: { hasContent: false } }
      )
      attachContainer(result.current.containerRef, container)
      rerender({ hasContent: true })

      const scrollTo = container.scrollTo as ReturnType<typeof vi.fn>

      // Saved=450 ≤ max=700 → fits on first apply, target cleared.
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 450, behavior: 'instant' })
      )

      scrollTo.mockClear()
      act(() => {
        resizeCallbacks.forEach((cb) =>
          cb([] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
        )
      })
      expect(scrollTo).not.toHaveBeenCalled()
    })

    it('re-applies bottom target on first visit when content grows', () => {
      mockSavedScroll.value = undefined
      const container = makeScrollContainer(1000, 300, 0)

      const { result, rerender } = renderHook(
        ({ hasContent }: { hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-settle-bottom',
            isStreaming: false,
            hasContent,
          }),
        { initialProps: { hasContent: false } }
      )
      attachContainer(result.current.containerRef, container)
      rerender({ hasContent: true })

      const scrollTo = container.scrollTo as ReturnType<typeof vi.fn>
      scrollTo.mockClear()

      // Iframe loads and grows the content — bottom target must follow.
      setScrollHeight(container, 1800)
      act(() => {
        resizeCallbacks.forEach((cb) =>
          cb([] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
        )
      })
      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ top: 1800, behavior: 'instant' })
      )
    })

    it('cancels the settling window when the user scrolls', () => {
      // Use a saved position that clamps so the target is kept after
      // placement — that's the case where user cancellation matters.
      mockSavedScroll.value = { scrollY: 2000 }
      const container = makeScrollContainer(1000, 300, 0)

      const { result, rerender } = renderHook(
        ({ hasContent }: { hasContent: boolean }) =>
          useAutoScroll({
            threadId: 'thread-settle-cancel',
            isStreaming: false,
            hasContent,
          }),
        { initialProps: { hasContent: false } }
      )
      attachContainer(result.current.containerRef, container)
      rerender({ hasContent: true })

      // User scrolls away from the placed position.
      container.scrollTop = 100
      act(() => {
        fireUserScroll(container)
      })

      const scrollTo = container.scrollTo as ReturnType<typeof vi.fn>
      scrollTo.mockClear()

      // Iframe would have grown the content further, but user took over.
      setScrollHeight(container, 3000)
      act(() => {
        resizeCallbacks.forEach((cb) =>
          cb([] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
        )
      })

      expect(scrollTo).not.toHaveBeenCalled()
    })

    it('stops re-applying after the settling window expires', () => {
      vi.useFakeTimers()
      try {
        // Bottom target never self-clears, so only the deadline stops it.
        mockSavedScroll.value = undefined
        const container = makeScrollContainer(1000, 300, 0)

        const { result, rerender } = renderHook(
          ({ hasContent }: { hasContent: boolean }) =>
            useAutoScroll({
              threadId: 'thread-settle-expire',
              isStreaming: false,
              hasContent,
            }),
          { initialProps: { hasContent: false } }
        )
        attachContainer(result.current.containerRef, container)
        rerender({ hasContent: true })

        // Advance past the 5000ms settling deadline.
        vi.advanceTimersByTime(6000)

        const scrollTo = container.scrollTo as ReturnType<typeof vi.fn>
        scrollTo.mockClear()

        act(() => {
          resizeCallbacks.forEach((cb) =>
            cb([] as unknown as ResizeObserverEntry[], {} as ResizeObserver)
          )
        })

        expect(scrollTo).not.toHaveBeenCalled()
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
