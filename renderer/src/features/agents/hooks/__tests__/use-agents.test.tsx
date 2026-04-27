import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSetThreadAgent } from '../use-agents'

const mockAgentsApi = {
  setThreadAgent: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAgentsApi.setThreadAgent.mockResolvedValue({ success: true })
  window.electronAPI = {
    ...(window.electronAPI ?? {}),
    chat: {
      ...(window.electronAPI?.chat ?? {}),
      agents: mockAgentsApi,
    },
  } as unknown as typeof window.electronAPI
})

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  const result = renderHook(() => useSetThreadAgent(), { wrapper })
  return { ...result, queryClient }
}

describe('useSetThreadAgent', () => {
  it('invalidates the thread agent and the canonical chat-thread query keys on success', async () => {
    const { result, queryClient } = renderWithClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    result.current.mutate({ threadId: 'thread-1', agentId: 'builtin.skills' })

    await waitFor(() => {
      expect(mockAgentsApi.setThreadAgent).toHaveBeenCalledWith(
        'thread-1',
        'builtin.skills'
      )
    })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['agents', 'thread', 'thread-1'],
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['chat', 'thread', 'thread-1'],
      })
    })

    // Guard against the prior bug where ['chat-thread'] (no array path) was used.
    const calls = invalidateSpy.mock.calls.map(([arg]) => arg?.queryKey)
    expect(calls).not.toContainEqual(['chat-thread'])
  })

  it('forwards a null agentId to the IPC layer for clearing the agent', async () => {
    const { result } = renderWithClient()

    result.current.mutate({ threadId: 'thread-9', agentId: null })

    await waitFor(() => {
      expect(mockAgentsApi.setThreadAgent).toHaveBeenCalledWith(
        'thread-9',
        null
      )
    })
  })
})
