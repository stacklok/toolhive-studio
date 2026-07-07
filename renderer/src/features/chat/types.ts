import type { UIMessage, LanguageModelUsage } from 'ai'

// Define message metadata schema for type safety
interface MessageMetadata {
  createdAt?: number
  model?: string
  providerId?: string
  totalUsage?: LanguageModelUsage
  responseTime?: number
  finishReason?: string
}

// Create a typed UIMessage with our metadata
export type ChatUIMessage = UIMessage<MessageMetadata>

export interface ChatProvider {
  id: string
  name: string
  models: string[]
}

// Chat settings - discriminated union for different provider types
export type ChatSettings =
  | {
      provider: 'ollama' | 'lmstudio'
      model: string
      endpointURL: string
      enabledTools?: string[]
    }
  | {
      provider: string
      model: string
      apiKey: string
      enabledTools?: string[]
    }

export interface ChatMcpServer {
  id: string
  name: string
  status: 'running' | 'stopped'
  package?: string
}
