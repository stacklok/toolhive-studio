import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AgentConfig,
  CreateAgentInput,
  UpdateAgentInput,
} from '../../../../../main/src/chat/agents/types'

const AGENT_QUERY_KEYS = {
  list: ['agents'] as const,
  detail: (id: string) => ['agents', id] as const,
  threadAgent: (threadId: string) => ['agents', 'thread', threadId] as const,
}

export function useAgents() {
  return useQuery({
    queryKey: AGENT_QUERY_KEYS.list,
    queryFn: (): Promise<AgentConfig[]> =>
      window.electronAPI.chat.agents.list(),
    refetchOnWindowFocus: false,
  })
}

export function useAgent(id: string | undefined) {
  return useQuery({
    queryKey: id ? AGENT_QUERY_KEYS.detail(id) : ['agents', 'none'],
    queryFn: (): Promise<AgentConfig | null> =>
      window.electronAPI.chat.agents.get(id!),
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useThreadAgentId(threadId: string | undefined) {
  return useQuery({
    queryKey: threadId
      ? AGENT_QUERY_KEYS.threadAgent(threadId)
      : ['agents', 'thread', 'none'],
    queryFn: (): Promise<string | null> =>
      window.electronAPI.chat.agents.getThreadAgentId(threadId!),
    enabled: !!threadId,
    refetchOnWindowFocus: false,
  })
}

export function useCreateAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAgentInput) =>
      window.electronAPI.chat.agents.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.list })
    },
  })
}

export function useUpdateAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAgentInput }) =>
      window.electronAPI.chat.agents.update(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.list })
      queryClient.invalidateQueries({
        queryKey: AGENT_QUERY_KEYS.detail(variables.id),
      })
    },
  })
}

export function useDeleteAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.electronAPI.chat.agents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.list })
    },
  })
}

export function useDuplicateAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => window.electronAPI.chat.agents.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AGENT_QUERY_KEYS.list })
    },
  })
}

export function useSetThreadAgent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      threadId,
      agentId,
    }: {
      threadId: string
      agentId: string | null
    }) => window.electronAPI.chat.agents.setThreadAgent(threadId, agentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: AGENT_QUERY_KEYS.threadAgent(variables.threadId),
      })
      queryClient.invalidateQueries({ queryKey: ['chat-thread'] })
    },
  })
}
