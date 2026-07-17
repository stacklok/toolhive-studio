import type {
  AgentConfig,
  CreateAgentInput,
  UpdateAgentInput,
} from '@common/types/agents'
import { runChatSync } from '../runtime'
import { AgentsService } from './agents-service'

export function seedBuiltinAgents(): void {
  runChatSync(AgentsService.seedBuiltinAgents())
}

export function listAgents(): AgentConfig[] {
  return runChatSync(AgentsService.listAgents())
}

export function getAgent(id: string): AgentConfig | null {
  return runChatSync(AgentsService.getAgent(id))
}

export function resolveAgentForThread(
  threadId: string | undefined
): AgentConfig {
  return runChatSync(AgentsService.resolveAgentForThread(threadId))
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
  return runChatSync(AgentsService.deleteAgent(id))
}

export function duplicateAgent(id: string): AgentConfig | null {
  return runChatSync(AgentsService.duplicateAgent(id))
}

export function setThreadAgent(threadId: string, agentId: string | null): void {
  runChatSync(AgentsService.setThreadAgent(threadId, agentId))
}

export function getThreadAgentId(threadId: string): string | null {
  return runChatSync(AgentsService.getThreadAgentId(threadId))
}
