import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoScroll } from '../use-auto-scroll'

// Use unique thread IDs per test so the module-level scrollPositions Map never has key collisions.

// JSDOM stubs scrollTo — override it to actually update scrollTop and fire scroll events.
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

  el.scrollTo = vi.fn((...args: [ScrollToOptions] | [number, number]) => {
    const top = typeof args[0] === 'object' ? args[0].top : args[1]
    if (top !== undefined) _scrollTop = top
    el.dispatchEvent(new Event('scroll'))
  }) as HTMLDivElement['scrollTo']

  return el
}

// Attach a container to the hook's ref after renderHook returns.
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

describe('useAutoScroll', () => {
  describe('basic return shape', () => {
    it('returns containerRef, showScrollToBottom, and scrollToBottom', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ resetDep: 'thread-basic', hasContent: false })
      )
      expect(result.current.containerRef).toBeDefined()
      expect(result.current.showScrollToBottom).toBe(false)
      expect(typeof result.current.scrollToBottom).toBe('function')
    })

    it('showScrollToBottom starts as false', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ resetDep: null, hasContent: false })
      )
      expect(result.current.showScrollToBottom).toBe(false)
    })
  })

  describe('scrollToBottom public method', () => {
    it('calls scrollTo on the container', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ resetDep: 'thread-stb', hasContent: true })
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
          useAutoScroll({ resetDep: 'thread-scroll-up', hasContent }),
        { initialProps: { hasContent: false } }
      )

      attachContainer(result.current.containerRef, container)
      rerender({ hasContent: true })

      act(() => {
        container.dispatchEvent(new Event('scroll'))
      })

      expect(result.current.showScrollToBottom).toBe(true)
    })

    it('keeps showScrollToBottom false when hasContent is false even if scrolled up', () => {
      const { result } = renderHook(() =>
        useAutoScroll({ resetDep: 'thread-no-content', hasContent: false })
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
        useAutoScroll({ resetDep: 'thread-near-bottom', hasContent: true })
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

  describe('thread switch — scroll position persistence', () => {
    it('scrolls to bottom on new thread (no saved position)', () => {
      const container = makeScrollContainer()

      const { result, rerender } = renderHook(
        ({ threadId }) =>
          useAutoScroll({ resetDep: threadId, hasContent: true }),
        { initialProps: { threadId: 'thread-initial' } }
      )

      attachContainer(result.current.containerRef, container)
      rerender({ threadId: 'thread-new-A' })

      expect(container.scrollTo).toHaveBeenCalled()
    })

    it('restores saved scroll position when switching back to a scrolled-up thread', () => {
      const container = makeScrollContainer(1000, 300, 200)

      const { result, rerender } = renderHook(
        ({ threadId }) =>
          useAutoScroll({ resetDep: threadId, hasContent: true }),
        { initialProps: { threadId: 'thread-persist-A' } }
      )
      attachContainer(result.current.containerRef, container)

      rerender({ threadId: 'thread-persist-B' })
      rerender({ threadId: 'thread-persist-A' })

      expect(container.scrollTo).toHaveBeenCalled()
    })

    it('resets showScrollToBottom to false when switching to a new thread', () => {
      const container = makeScrollContainer(1000, 300, 0)

      const { result, rerender } = renderHook(
        ({ threadId, hasContent }: { threadId: string; hasContent: boolean }) =>
          useAutoScroll({ resetDep: threadId, hasContent }),
        { initialProps: { threadId: 'thread-reset-A', hasContent: false } }
      )

      attachContainer(result.current.containerRef, container)
      rerender({ threadId: 'thread-reset-A', hasContent: true })

      act(() => {
        container.dispatchEvent(new Event('scroll'))
      })
      expect(result.current.showScrollToBottom).toBe(true)

      rerender({ threadId: 'thread-reset-B', hasContent: true })
      expect(result.current.showScrollToBottom).toBe(false)
    })
  })
})
