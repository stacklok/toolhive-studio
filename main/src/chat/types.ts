import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import type { UIMessage } from 'ai'

// Define message metadata schema for type safety
interface MessageMetadata {
  createdAt?: number
  model?: string
  providerId?: string
  totalUsage?: LanguageModelV2Usage
  responseTime?: number
  finishReason?: string
}

// Create a typed UIMessage with our metadata
export type ChatUIMessage = UIMessage<MessageMetadata>

// Chat request interface - discriminated union for different provider types
export type ChatRequest =
  | {
      chatId: string
      messages: ChatUIMessage[]
      provider: 'ollama' | 'lmstudio'
      model: string
      endpointURL: string
      enabledTools?: string[]
    }
  | {
      chatId: string
      messages: ChatUIMessage[]
      provider: string
      model: string
      apiKey: string
      enabledTools?: string[]
    }

export interface AvailableServer {
  serverName: string
  serverPackage?: string
  tools: Array<{
    name: string
    description?: string
    parameters?: Record<string, unknown>
    enabled: boolean
  }>
  isRunning: boolean
}
