import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMcpAppMetadata } from '../use-mcp-app-metadata'
import type { ToolUiMetadataEntry } from '../use-mcp-app-metadata'

const CHANNEL = 'chat:stream:tool-ui-metadata'

const sampleMetadata: Record<string, ToolUiMetadataEntry> = {
  'my-tool': { resourceUri: 'ui://my-tool/view.html', serverName: 'my-server' },
}

describe('useMcpAppMetadata', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    window.electronAPI.chat = {
      ...window.electronAPI.chat,
      getToolUiMetadata: vi.fn().mockResolvedValue({}),
    }
    mockUnsubscribe.mockClear()
    window.electronAPI.on = vi.fn().mockReturnValue(mockUnsubscribe)
    window.electronAPI.removeListener = vi.fn()
  })

  it('returns empty object as initial state', () => {
    const { result } = renderHook(() => useMcpAppMetadata())
    expect(result.current).toEqual({})
  })

  it('populates state from getToolUiMetadata on mount', async () => {
    vi.mocked(window.electronAPI.chat.getToolUiMetadata).mockResolvedValue(
      sampleMetadata
    )

    const { result } = renderHook(() => useMcpAppMetadata())

    await waitFor(() => {
      expect(result.current).toEqual(sampleMetadata)
    })
  })

  it('stays empty when getToolUiMetadata returns an empty object', async () => {
    vi.mocked(window.electronAPI.chat.getToolUiMetadata).mockResolvedValue({})

    const { result } = renderHook(() => useMcpAppMetadata())

    await waitFor(() => {
      expect(
        vi.mocked(window.electronAPI.chat.getToolUiMetadata)
      ).toHaveBeenCalledOnce()
    })
    expect(result.current).toEqual({})
  })

  it('stays empty and does not throw when getToolUiMetadata rejects', async () => {
    vi.mocked(window.electronAPI.chat.getToolUiMetadata).mockRejectedValue(
      new Error('IPC error')
    )

    const { result } = renderHook(() => useMcpAppMetadata())

    await waitFor(() => {
      expect(
        vi.mocked(window.electronAPI.chat.getToolUiMetadata)
      ).toHaveBeenCalledOnce()
    })
    expect(result.current).toEqual({})
  })

  it('subscribes to chat:stream:tool-ui-metadata on mount', () => {
    renderHook(() => useMcpAppMetadata())

    expect(window.electronAPI.on).toHaveBeenCalledWith(
      CHANNEL,
      expect.any(Function)
    )
  })

  it('updates state when the event fires', async () => {
    const { result } = renderHook(() => useMcpAppMetadata())

    // Capture the listener registered with window.electronAPI.on
    const onCalls = vi.mocked(window.electronAPI.on).mock.calls
    const [, listener] = onCalls.find(([ch]) => ch === CHANNEL) ?? []
    expect(listener).toBeDefined()

    act(() => {
      ;(listener as (...args: unknown[]) => void)(sampleMetadata)
    })

    expect(result.current).toEqual(sampleMetadata)
  })

  it('overwrites existing state when the event fires a second time', async () => {
    const updated: Record<string, ToolUiMetadataEntry> = {
      'other-tool': {
        resourceUri: 'ui://other/view.html',
        serverName: 'other-server',
      },
    }

    vi.mocked(window.electronAPI.chat.getToolUiMetadata).mockResolvedValue(
      sampleMetadata
    )

    const { result } = renderHook(() => useMcpAppMetadata())
    await waitFor(() => expect(result.current).toEqual(sampleMetadata))

    const onCalls = vi.mocked(window.electronAPI.on).mock.calls
    const [, listener] = onCalls.find(([ch]) => ch === CHANNEL) ?? []

    act(() => {
      ;(listener as (...args: unknown[]) => void)(updated)
    })

    expect(result.current).toEqual(updated)
  })

  it('calls the unsubscribe function returned by electronAPI.on on unmount', () => {
    const { unmount } = renderHook(() => useMcpAppMetadata())

    expect(mockUnsubscribe).not.toHaveBeenCalled()

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalledOnce()
  })
})
