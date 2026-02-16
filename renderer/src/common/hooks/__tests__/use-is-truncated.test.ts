import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsTruncated } from '../use-is-truncated'

function createElement(
  overrides: {
    scrollWidth?: number
    clientWidth?: number
    scrollHeight?: number
    clientHeight?: number
  } = {}
): HTMLElement {
  const el = document.createElement('span')
  Object.defineProperty(el, 'scrollWidth', {
    get: () => overrides.scrollWidth ?? 100,
    configurable: true,
  })
  Object.defineProperty(el, 'clientWidth', {
    get: () => overrides.clientWidth ?? 100,
    configurable: true,
  })
  Object.defineProperty(el, 'scrollHeight', {
    get: () => overrides.scrollHeight ?? 20,
    configurable: true,
  })
  Object.defineProperty(el, 'clientHeight', {
    get: () => overrides.clientHeight ?? 20,
    configurable: true,
  })
  return el
}

function flushRAF() {
  vi.advanceTimersByTime(16)
}

describe('useIsTruncated', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when element is null', () => {
    const { result } = renderHook(() => useIsTruncated(null))

    act(() => flushRAF())

    expect(result.current).toBe(false)
  })

  it('returns false when text is not truncated', () => {
    const el = createElement({ scrollWidth: 100, clientWidth: 100 })

    const { result } = renderHook(() => useIsTruncated(el))

    act(() => flushRAF())

    expect(result.current).toBe(false)
  })

  it('returns true when horizontally truncated', () => {
    const el = createElement({ scrollWidth: 300, clientWidth: 100 })

    const { result } = renderHook(() => useIsTruncated(el))

    act(() => flushRAF())

    expect(result.current).toBe(true)
  })

  it('returns true when vertically truncated', () => {
    const el = createElement({ scrollHeight: 60, clientHeight: 20 })

    const { result } = renderHook(() => useIsTruncated(el))

    act(() => flushRAF())

    expect(result.current).toBe(true)
  })

  it('re-measures when element changes', () => {
    const notTruncated = createElement({ scrollWidth: 100, clientWidth: 100 })
    const truncated = createElement({ scrollWidth: 300, clientWidth: 100 })

    const { result, rerender } = renderHook(({ el }) => useIsTruncated(el), {
      initialProps: { el: notTruncated as HTMLElement },
    })

    act(() => flushRAF())
    expect(result.current).toBe(false)

    rerender({ el: truncated })

    act(() => flushRAF())
    expect(result.current).toBe(true)
  })

  it('retains last value when element becomes null', () => {
    const el = createElement({ scrollWidth: 300, clientWidth: 100 })

    const { result, rerender } = renderHook(({ el }) => useIsTruncated(el), {
      initialProps: { el: el as HTMLElement | null },
    })

    act(() => flushRAF())
    expect(result.current).toBe(true)

    rerender({ el: null })

    act(() => flushRAF())
    // State is retained — no measurement runs when element is null
    expect(result.current).toBe(true)
  })

  it('re-measures on window resize', () => {
    let scrollWidth = 100
    const el = document.createElement('span')
    Object.defineProperty(el, 'scrollWidth', {
      get: () => scrollWidth,
      configurable: true,
    })
    Object.defineProperty(el, 'clientWidth', {
      get: () => 100,
      configurable: true,
    })
    Object.defineProperty(el, 'scrollHeight', {
      get: () => 20,
      configurable: true,
    })
    Object.defineProperty(el, 'clientHeight', {
      get: () => 20,
      configurable: true,
    })

    const { result } = renderHook(() => useIsTruncated(el))

    act(() => flushRAF())
    expect(result.current).toBe(false)

    scrollWidth = 300

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    act(() => flushRAF())

    expect(result.current).toBe(true)
  })

  it('cleans up listeners on unmount', () => {
    const el = createElement()
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useIsTruncated(el))

    act(() => flushRAF())

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    )

    removeEventListenerSpy.mockRestore()
  })
})
