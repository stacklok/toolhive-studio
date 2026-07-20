import type { LanguageModelUsage } from 'ai'
import type { UIMessage } from 'ai'
import type { ChatUIMessage } from '../types'

export interface ChatSettingsThread {
  id: string
  title?: string
  /** When true, auto-title generation will never overwrite this title. */
  titleEditedByUser?: boolean
  starred?: boolean
  messages: ChatUIMessage[]
  lastEditTimestamp: number
  createdAt: number
  /**
   * Id of the agent that should run for this thread. When absent, the
   * main process falls back to the default built-in agent.
   */
  agentId?: string | null
  /** Per-thread selected provider id (e.g. "openai"). NULL falls back to global. */
  selectedProvider?: string | null
  /** Per-thread selected model id. NULL falls back to global. */
  selectedModel?: string | null
  /** Per-thread enabled MCP tools, keyed by server name. NULL falls back to global. */
  enabledMcpTools?: Record<string, string[]> | null
  /** Per-thread enabled skill names. NULL falls back to global. */
  enabledSkills?: string[] | null
}

export type ThreadMessage = UIMessage<{
  createdAt?: number
  model?: string
  providerId?: string
  totalUsage?: LanguageModelUsage
  responseTime?: number
  finishReason?: string
}>

export type ThreadUpdates = Partial<
  Omit<ChatSettingsThread, 'id' | 'createdAt'>
>
