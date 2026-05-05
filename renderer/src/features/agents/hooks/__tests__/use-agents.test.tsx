import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useAgent,
  useAgents,
  useCreateAgent,
  useDeleteAgent,
  useDuplicateAgent,
  useSetThreadAgent,
  useThreadAgentId,
  useUpdateAgent,
} from '../use-agents'
import type {
  AgentConfig,
  CreateAgentInput,
  UpdateAgentInput,
} from '@common/types/agents'

const mockAgentsApi = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  duplicate: vi.fn(),
  setThreadAgent: vi.fn(),
  getThreadAgentId: vi.fn(),
}

const sampleAgent: AgentConfig = {
  id: 'custom.my-agent',
  kind: 'custom',
  name: 'My agent',
  description: 'desc',
  instructions: 'go',
  builtinToolsKey: null,
  createdAt: 0,
  updatedAt: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAgentsApi.setThreadAgent.mockResolvedValue({ success: true })
  mockAgentsApi.list.mockResolvedValue([sampleAgent])
  mockAgentsApi.get.mockResolvedValue(sampleAgent)
  mockAgentsApi.create.mockResolvedValue(sampleAgent)
  mockAgentsApi.update.mockResolvedValue(sampleAgent)
  mockAgentsApi.delete.mockResolvedValue({ success: true })
  mockAgentsApi.duplicate.mockResolvedValue(sampleAgent)
  mockAgentsApi.getThreadAgentId.mockResolvedValue(null)

  window.electronAPI = {
    ...(window.electronAPI ?? {}),
    chat: {
      ...(window.electronAPI?.chat ?? {}),
      agents: mockAgentsApi,
    },
  } as unknown as typeof window.electronAPI
})

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { wrapper, queryClient }
}

describe('useAgents', () => {
  it('lists agents via the IPC layer', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAgents(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([sampleAgent]))
    expect(mockAgentsApi.list).toHaveBeenCalled()
  })
})

describe('useAgent', () => {
  it('does not fetch until an id is provided', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useAgent(undefined), { wrapper })
    expect(mockAgentsApi.get).not.toHaveBeenCalled()
  })

  it('fetches the agent for the provided id', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useAgent('custom.my-agent'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.data).toEqual(sampleAgent))
    expect(mockAgentsApi.get).toHaveBeenCalledWith('custom.my-agent')
  })
})

describe('useThreadAgentId', () => {
  it('does not query until a threadId is provided', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useThreadAgentId(undefined), { wrapper })
    expect(mockAgentsApi.getThreadAgentId).not.toHaveBeenCalled()
  })

  it('returns the assigned thread agent id from the IPC layer', async () => {
    mockAgentsApi.getThreadAgentId.mockResolvedValue('builtin.skills')
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useThreadAgentId('thread-1'), {
      wrapper,
    })

    await waitFor(() => expect(result.current.data).toBe('builtin.skills'))
    expect(mockAgentsApi.getThreadAgentId).toHaveBeenCalledWith('thread-1')
  })
})

describe('useCreateAgent', () => {
  it('creates an agent and invalidates the list query', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateAgent(), { wrapper })

    const input: CreateAgentInput = {
      name: 'My agent',
      description: 'desc',
      instructions: 'go',
    }
    result.current.mutate(input)

    await waitFor(() => {
      expect(mockAgentsApi.create).toHaveBeenCalledWith(input)
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['agents'] })
    })
  })
})

describe('useUpdateAgent', () => {
  it('updates an agent and invalidates list + detail queries', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateAgent(), { wrapper })

    const input: UpdateAgentInput = { name: 'Renamed' }
    result.current.mutate({ id: 'custom.my-agent', input })

    await waitFor(() => {
      expect(mockAgentsApi.update).toHaveBeenCalledWith(
        'custom.my-agent',
        input
      )
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['agents'] })
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['agents', 'custom.my-agent'],
      })
    })
  })
})

describe('useDeleteAgent', () => {
  it('deletes an agent and invalidates the list query', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteAgent(), { wrapper })

    result.current.mutate('custom.my-agent')

    await waitFor(() => {
      expect(mockAgentsApi.delete).toHaveBeenCalledWith('custom.my-agent')
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['agents'] })
    })
  })
})

describe('useDuplicateAgent', () => {
  it('duplicates an agent and invalidates the list query', async () => {
    const { wrapper, queryClient } = makeWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDuplicateAgent(), { wrapper })

    result.current.mutate('builtin.toolhive-assistant')

    await waitFor(() => {
      expect(mockAgentsApi.duplicate).toHaveBeenCalledWith(
        'builtin.toolhive-assistant'
      )
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['agents'] })
    })
  })
})

describe('useSetThreadAgent', () => {
  function renderSetThreadAgent() {
    const { wrapper, queryClient } = makeWrapper()
    const result = renderHook(() => useSetThreadAgent(), { wrapper })
    return { ...result, queryClient }
  }

  it('invalidates the thread agent and the canonical chat-thread query keys on success', async () => {
    const { result, queryClient } = renderSetThreadAgent()
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
    const { result } = renderSetThreadAgent()

    result.current.mutate({ threadId: 'thread-9', agentId: null })

    await waitFor(() => {
      expect(mockAgentsApi.setThreadAgent).toHaveBeenCalledWith(
        'thread-9',
        null
      )
    })
  })
})
