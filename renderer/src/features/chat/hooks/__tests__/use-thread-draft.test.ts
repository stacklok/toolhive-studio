import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useThreadDraft, clearThreadDraft } from '../use-thread-draft'

const STORAGE_PREFIX = 'toolhive.playground.draft.'

describe('useThreadDraft', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
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

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useThreadDraft('t1'))

    act(() => {
      result.current[1]('draft text')
    })

    expect(result.current[0]).toBe('draft text')
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBe('draft text')
  })

  it('removes the key when cleared to empty string', () => {
    localStorage.setItem(`${STORAGE_PREFIX}t1`, 'existing')
    const { result } = renderHook(() => useThreadDraft('t1'))

    act(() => {
      result.current[1]('')
    })

    expect(result.current[0]).toBe('')
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBeNull()
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

    expect(localStorage.getItem(`${STORAGE_PREFIX}t2`)).toBe('written to t2')
    expect(localStorage.getItem(`${STORAGE_PREFIX}t1`)).toBeNull()
  })

  it('does not persist when threadId is undefined', () => {
    const { result } = renderHook(() => useThreadDraft(undefined))

    act(() => {
      result.current[1]('in-memory only')
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
})
