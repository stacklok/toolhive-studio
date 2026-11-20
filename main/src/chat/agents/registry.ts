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
  runChatSync(AgentsService.use((s) => s.seedBuiltinAgents()))
}

export function listAgents(): AgentConfig[] {
  return runChatSyncOr(
    AgentsService.use((s) => s.listAgents()),
    []
  )
}

export function getAgent(id: string): AgentConfig | null {
  return runChatSyncOr(
    AgentsService.use((s) => s.getAgent(id)),
    null
  )
}

export function resolveAgentForThread(
  threadId: string | undefined
): AgentConfig {
  return runChatSyncOr(
    AgentsService.use((s) => s.resolveAgentForThread(threadId)),
    createDefaultAgentConfig()
  )
}

export function createCustomAgent(input: CreateAgentInput): AgentConfig {
  return runChatSync(AgentsService.use((s) => s.createCustomAgent(input)))
}

export function updateAgent(
  id: string,
  input: UpdateAgentInput
): AgentConfig | null {
  return runChatSync(AgentsService.use((s) => s.updateAgent(id, input)))
}

export function deleteAgent(id: string): {
  success: boolean
  error?: string
} {
  return runChatSyncOr(
    AgentsService.use((s) => s.deleteAgent(id)),
    {
      success: false,
      error: CHAT_UNAVAILABLE_USER_MESSAGE,
    }
  )
}

export function duplicateAgent(id: string): {
  success: boolean
  agent?: AgentConfig
  error?: string
} {
  return runChatSyncOr(
    AgentsService.use((s) => s.duplicateAgent(id)).pipe(
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
  runChatSync(AgentsService.use((s) => s.setThreadAgent(threadId, agentId)))
}

export function getThreadAgentId(threadId: string): string | null {
  return runChatSyncOr(
    AgentsService.use((s) => s.getThreadAgentId(threadId)),
    null
  )
}
