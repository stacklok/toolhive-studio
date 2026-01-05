import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedCallback } from '../use-debounced-callback'

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce the callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('arg1')
      result.current('arg2')
      result.current('arg3')
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('arg3')
  })

  it('should use default delay of 500ms', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback))

    act(() => {
      result.current()
    })

    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should reset the timer on each call', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current()
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      result.current()
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should pass arguments to the callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 100))

    act(() => {
      result.current('hello', 42, { key: 'value' })
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(callback).toHaveBeenCalledWith('hello', 42, { key: 'value' })
  })

  it('should use the latest callback reference', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const { result, rerender } = renderHook(
      ({ callback }) => useDebouncedCallback(callback, 500),
      { initialProps: { callback: callback1 } }
    )

    act(() => {
      result.current()
    })

    rerender({ callback: callback2 })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledTimes(1)
  })

  it('should cleanup timeout on unmount', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(callback, 500)
    )

    act(() => {
      result.current()
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('should return a stable function reference when delay does not change', () => {
    const callback = vi.fn()
    const { result, rerender } = renderHook(
      ({ cb }) => useDebouncedCallback(cb, 500),
      { initialProps: { cb: callback } }
    )

    const firstRef = result.current

    rerender({ cb: vi.fn() })

    expect(result.current).toBe(firstRef)
  })

  it('should return a new function reference when delay changes', () => {
    const callback = vi.fn()
    const { result, rerender } = renderHook(
      ({ delay }) => useDebouncedCallback(callback, delay),
      { initialProps: { delay: 500 } }
    )

    const firstRef = result.current

    rerender({ delay: 600 })

    expect(result.current).not.toBe(firstRef)
  })

  it('should handle rapid successive calls correctly', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 100))

    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current(`value-${i}`)
        vi.advanceTimersByTime(50)
      }
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('value-9')
  })
})
