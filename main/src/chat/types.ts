import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import type { UIMessage, LanguageModel } from 'ai'
import type { LocalProviderId, ChatProviderInfo } from './constants'

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

// Base chat request with common fields
type BaseChatRequest = {
  chatId: string
  messages: ChatUIMessage[]
  model: string
  enabledTools?: string[]
}

// Chat request interface - discriminated union for different provider types
export type ChatRequest =
  | (BaseChatRequest & {
      provider: LocalProviderId
      endpointURL: string
    })
  | (BaseChatRequest & {
      provider: Exclude<string, LocalProviderId>
      apiKey: string
    })

// Chat provider configuration with functions
// Discriminated union: Ollama and LM Studio use endpointURL, others use apiKey
export type ChatProvider =
  | (ChatProviderInfo & {
      id: 'ollama' | 'lmstudio'
      createModel: (modelId: string, endpointURL: string) => LanguageModel
    })
  | (ChatProviderInfo & {
      id: Exclude<string, 'ollama' | 'lmstudio'>
      createModel: (modelId: string, apiKey: string) => LanguageModel
    })

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
