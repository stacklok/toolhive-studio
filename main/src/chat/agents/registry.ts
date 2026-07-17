import type {
  AgentConfig,
  CreateAgentInput,
  UpdateAgentInput,
} from '@common/types/agents'
import { DEFAULT_AGENT_ID } from '@common/types/agents'
import { APP_ASSISTANT_NAME } from '@common/app-info'
import {
  CHAT_UNAVAILABLE_USER_MESSAGE,
  runChatSync,
  runChatSyncOr,
} from '../runtime'
import { AgentsService } from './agents-service'

function unavailableAgentFallback(): AgentConfig {
  const now = Date.now()
  return {
    id: DEFAULT_AGENT_ID,
    kind: 'builtin',
    name: APP_ASSISTANT_NAME,
    description: '',
    instructions: 'You are a helpful assistant.',
    builtinToolsKey: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function seedBuiltinAgents(): void {
  runChatSync(AgentsService.seedBuiltinAgents())
}

export function listAgents(): AgentConfig[] {
  return runChatSyncOr(AgentsService.listAgents(), [])
}

export function getAgent(id: string): AgentConfig | null {
  return runChatSyncOr(AgentsService.getAgent(id), null)
}

export function resolveAgentForThread(
  threadId: string | undefined
): AgentConfig {
  return runChatSyncOr(
    AgentsService.resolveAgentForThread(threadId),
    unavailableAgentFallback()
  )
}

export function createCustomAgent(input: CreateAgentInput): AgentConfig {
  return runChatSync(AgentsService.createCustomAgent(input))
}

export function updateAgent(
  id: string,
  input: UpdateAgentInput
): AgentConfig | null {
  return runChatSync(AgentsService.updateAgent(id, input))
}

export function deleteAgent(id: string): {
  success: boolean
  error?: string
} {
  return runChatSyncOr(AgentsService.deleteAgent(id), {
    success: false,
    error: CHAT_UNAVAILABLE_USER_MESSAGE,
  })
}

export function duplicateAgent(id: string): AgentConfig | null {
  return runChatSyncOr(AgentsService.duplicateAgent(id), null)
}

export function setThreadAgent(threadId: string, agentId: string | null): void {
  runChatSync(AgentsService.setThreadAgent(threadId, agentId))
}

export function getThreadAgentId(threadId: string): string | null {
  return runChatSyncOr(AgentsService.getThreadAgentId(threadId), null)
}
