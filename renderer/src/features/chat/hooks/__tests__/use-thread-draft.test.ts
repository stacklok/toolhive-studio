import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useThreadDraft, clearThreadDraft } from '../use-thread-draft'

const STORAGE_PREFIX = 'toolhive.playground.draft.'
const DEBOUNCE_MS = 200

describe('useThreadDraft', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('returns empty string when no draft exists', () => {
    const { result } = renderHook(() => useThreadDraft('t1'))
    expect(result.current[0]).toBe('')
  })

  it('reads existing draft from localStorage on mount', () => {
    localStorage.setItem(`${STORAGE_PREFIX}t1`, 'hello')
    const { result } = renderHook(() => useThreadDraft('t1'))
    expect(result.current[0]).toBe('hello')
  })

  it('updates in-memory state synchronously but debounces the localStorage write', () => {
    const { result } = renderHook(() => useThreadDraft('t1'))

    act(() => {
      result.current[1]('draft text')
    })

    expect(result.current[0]).toBe('draft text')
    // Not yet written — debounce hasn't fired
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBeNull()

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBe('draft text')
  })

  it('coalesces rapid consecutive updates into a single write', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => useThreadDraft('t1'))

    act(() => {
      result.current[1]('h')
      result.current[1]('he')
      result.current[1]('hel')
      result.current[1]('hell')
      result.current[1]('hello')
    })

    expect(setItemSpy).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBe('hello')
    expect(setItemSpy).toHaveBeenCalledTimes(1)
    setItemSpy.mockRestore()
  })

  it('removes the key when cleared to empty string (after debounce)', () => {
    localStorage.setItem(`${STORAGE_PREFIX}t1`, 'existing')
    const { result } = renderHook(() => useThreadDraft('t1'))

    act(() => {
      result.current[1]('')
    })

    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    expect(result.current[0]).toBe('')
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBeNull()
  })

  // Regression: ChatInterface swaps between the centered (empty-state) and
  // bottom (with-messages) composer when `hasMessages` flips after the user
  // submits. Both instances are keyed by the same `threadId`, so the new
  // instance's `useState` lazy initializer re-reads `localStorage` before
  // the unmounting instance's flush runs. If the clear write is debounced,
  // the new composer re-hydrates with the just-sent draft.
  it('clears storage synchronously when the draft is reset to empty', () => {
    localStorage.setItem(`${STORAGE_PREFIX}t1`, 'hello')
    const { result } = renderHook(() => useThreadDraft('t1'))

    act(() => {
      result.current[1]('')
    })

    // No timer advance — the write must have already happened so any
    // component that remounts in the same commit reads empty.
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBeNull()
    expect(result.current[0]).toBe('')
  })

  it('a fresh mount after clearing reads empty, not the previous draft', () => {
    const { result, unmount } = renderHook(() => useThreadDraft('t1'))

    act(() => {
      result.current[1]('hello')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBe('hello')

    // Simulates the submit handler clearing the draft.
    act(() => {
      result.current[1]('')
    })

    // Mount a new instance with the same threadId before the previous one
    // unmounts (mirrors render-before-commit ordering when the empty-state
    // and with-messages composers swap).
    const { result: r2 } = renderHook(() => useThreadDraft('t1'))
    expect(r2.current[0]).toBe('')

    unmount()
  })

  it('flushes the pending write on unmount', () => {
    const { result, unmount } = renderHook(() => useThreadDraft('t1'))

    act(() => {
      result.current[1]('typed just before unmount')
    })

    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBeNull()

    unmount()

    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBe(
      'typed just before unmount'
    )
  })

  // The hook relies on the consuming component being keyed by threadId,
  // so switching threads remounts and the lazy initializer picks up the
  // new draft. These tests simulate that remount.
  it('loads the correct draft on remount with a different threadId', () => {
    localStorage.setItem(`${STORAGE_PREFIX}t1`, 'from t1')
    localStorage.setItem(`${STORAGE_PREFIX}t2`, 'from t2')

    const { result: r1, unmount } = renderHook(() => useThreadDraft('t1'))
    expect(r1.current[0]).toBe('from t1')
    unmount()

    const { result: r2 } = renderHook(() => useThreadDraft('t2'))
    expect(r2.current[0]).toBe('from t2')
  })

  it('writes to the correct thread key after remount', () => {
    const { unmount } = renderHook(() => useThreadDraft('t1'))
    unmount()

    const { result } = renderHook(() => useThreadDraft('t2'))
    act(() => {
      result.current[1]('written to t2')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    expect(localStorage.getItem(`${STORAGE_PREFIX}t2`)).toBe('written to t2')
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBeNull()
  })

  it('does not persist when threadId is undefined', () => {
    const { result } = renderHook(() => useThreadDraft(undefined))

    act(() => {
      result.current[1]('in-memory only')
    })
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS)
    })

    expect(result.current[0]).toBe('in-memory only')
    expect(localStorage.length).toBe(0)
  })
})

describe('clearThreadDraft', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('removes the stored draft for a thread', () => {
    localStorage.setItem(`${STORAGE_PREFIX}t1`, 'hello')
    clearThreadDraft('t1')
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBeNull()
  })

  it('is a no-op for undefined threadId', () => {
    localStorage.setItem(`${STORAGE_PREFIX}t1`, 'hello')
    clearThreadDraft(undefined)
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBe('hello')
  })

  it('is a no-op for null threadId', () => {
    localStorage.setItem(`${STORAGE_PREFIX}t1`, 'hello')
    clearThreadDraft(null)
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBe('hello')
  })
})
