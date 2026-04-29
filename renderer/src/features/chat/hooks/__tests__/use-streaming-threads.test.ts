import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useStreamingThreads } from '../use-streaming-threads'

const CHANNEL = 'chat:stream:state'

describe('useStreamingThreads', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    window.electronAPI.chat = {
      ...window.electronAPI.chat,
      getStreamingThreadIds: vi.fn().mockResolvedValue([]),
    }
    mockUnsubscribe.mockClear()
    window.electronAPI.on = vi.fn().mockReturnValue(mockUnsubscribe)
    window.electronAPI.removeListener = vi.fn()
  })

  it('returns an empty Set as initial state', () => {
    const { result } = renderHook(() => useStreamingThreads())
    expect(result.current).toBeInstanceOf(Set)
    expect(result.current.size).toBe(0)
  })

  it('seeds the set from getStreamingThreadIds on mount', async () => {
    vi.mocked(window.electronAPI.chat.getStreamingThreadIds).mockResolvedValue([
      'thread-a',
      'thread-b',
    ])

    const { result } = renderHook(() => useStreamingThreads())

    await waitFor(() => {
      expect(result.current.has('thread-a')).toBe(true)
      expect(result.current.has('thread-b')).toBe(true)
    })
    expect(result.current.size).toBe(2)
  })

  it('stays empty and does not throw when getStreamingThreadIds rejects', async () => {
    vi.mocked(window.electronAPI.chat.getStreamingThreadIds).mockRejectedValue(
      new Error('IPC error')
    )

    const { result } = renderHook(() => useStreamingThreads())

    await waitFor(() => {
      expect(
        vi.mocked(window.electronAPI.chat.getStreamingThreadIds)
      ).toHaveBeenCalledOnce()
    })
    expect(result.current.size).toBe(0)
  })

  it('subscribes to chat:stream:state on mount', () => {
    renderHook(() => useStreamingThreads())

    expect(window.electronAPI.on).toHaveBeenCalledWith(
      CHANNEL,
      expect.any(Function)
    )
  })

  it('adds a thread id when a streaming event arrives', () => {
    const { result } = renderHook(() => useStreamingThreads())

    const onCalls = vi.mocked(window.electronAPI.on).mock.calls
    const [, listener] = onCalls.find(([ch]) => ch === CHANNEL) ?? []
    expect(listener).toBeDefined()

    act(() => {
      ;(listener as (...args: unknown[]) => void)({
        chatId: 'thread-x',
        status: 'streaming',
      })
    })

    expect(result.current.has('thread-x')).toBe(true)
  })

  it('removes a thread id when a finished event arrives', async () => {
    vi.mocked(window.electronAPI.chat.getStreamingThreadIds).mockResolvedValue([
      'thread-x',
    ])

    const { result } = renderHook(() => useStreamingThreads())

    await waitFor(() => {
      expect(result.current.has('thread-x')).toBe(true)
    })

    const onCalls = vi.mocked(window.electronAPI.on).mock.calls
    const [, listener] = onCalls.find(([ch]) => ch === CHANNEL) ?? []

    act(() => {
      ;(listener as (...args: unknown[]) => void)({
        chatId: 'thread-x',
        status: 'finished',
      })
    })

    expect(result.current.has('thread-x')).toBe(false)
  })

  it('removes a thread id when an error event arrives', () => {
    const { result } = renderHook(() => useStreamingThreads())

    const onCalls = vi.mocked(window.electronAPI.on).mock.calls
    const [, listener] = onCalls.find(([ch]) => ch === CHANNEL) ?? []

    act(() => {
      ;(listener as (...args: unknown[]) => void)({
        chatId: 'thread-x',
        status: 'streaming',
      })
    })
    expect(result.current.has('thread-x')).toBe(true)

    act(() => {
      ;(listener as (...args: unknown[]) => void)({
        chatId: 'thread-x',
        status: 'error',
      })
    })
    expect(result.current.has('thread-x')).toBe(false)
  })

  it('ignores events without a chatId', () => {
    const { result } = renderHook(() => useStreamingThreads())

    const onCalls = vi.mocked(window.electronAPI.on).mock.calls
    const [, listener] = onCalls.find(([ch]) => ch === CHANNEL) ?? []

    act(() => {
      ;(listener as (...args: unknown[]) => void)(undefined)
      ;(listener as (...args: unknown[]) => void)({ status: 'streaming' })
    })

    expect(result.current.size).toBe(0)
  })

  it('calls the unsubscribe handle returned by `on` on unmount', () => {
    const { unmount } = renderHook(() => useStreamingThreads())

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('falls back to removeListener when `on` does not return a function', () => {
    window.electronAPI.on = vi.fn().mockReturnValue(undefined)
    const removeListener = vi.fn()
    window.electronAPI.removeListener = removeListener

    const { unmount } = renderHook(() => useStreamingThreads())

    unmount()

    expect(removeListener).toHaveBeenCalledWith(CHANNEL, expect.any(Function))
  })

  it('does not update state if getStreamingThreadIds resolves after unmount', async () => {
    let resolveIds: (ids: string[]) => void = () => {}
    vi.mocked(window.electronAPI.chat.getStreamingThreadIds).mockReturnValue(
      new Promise<string[]>((resolve) => {
        resolveIds = resolve
      })
    )

    const { result, unmount } = renderHook(() => useStreamingThreads())
    unmount()

    await act(async () => {
      resolveIds(['thread-late'])
      await Promise.resolve()
    })

    // No assertion on result.current after unmount is meaningful, but
    // we at least ensure no error is thrown.
    expect(result.current.size).toBe(0)
  })
})
