import type {
  AgentConfig,
  CreateAgentInput,
  UpdateAgentInput,
} from '@common/types/agents'
import { Effect } from 'effect'
import {
  CHAT_UNAVAILABLE_USER_MESSAGE,
  runChatSync,
  runChatSyncOr,
} from '../runtime'
import { AgentsService } from './agents-service'
import { createDefaultAgentConfig } from './default-agent'

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
    createDefaultAgentConfig()
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

export function duplicateAgent(id: string): {
  success: boolean
  agent?: AgentConfig
  error?: string
} {
  return runChatSyncOr(
    AgentsService.duplicateAgent(id).pipe(
      Effect.map(
        (agent): { success: boolean; agent?: AgentConfig; error?: string } =>
          agent
            ? { success: true, agent }
            : { success: false, error: 'Agent not found' }
      )
    ),
    {
      success: false,
      error: CHAT_UNAVAILABLE_USER_MESSAGE,
    }
  )
}

export function setThreadAgent(threadId: string, agentId: string | null): void {
  runChatSync(AgentsService.setThreadAgent(threadId, agentId))
}

export function getThreadAgentId(threadId: string): string | null {
  return runChatSyncOr(AgentsService.getThreadAgentId(threadId), null)
}
