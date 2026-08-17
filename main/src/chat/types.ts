import type { LanguageModelUsage, UIMessage, LanguageModel } from 'ai'
import type {
  LocalProviderId,
  GatewayProviderId,
  ChatProviderInfo,
} from './constants'

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

// Base chat request with common fields
type BaseChatRequest = {
  chatId: string
  messages: ChatUIMessage[]
  model: string
  enabledTools?: string[]
  /**
   * The id of the agent selected for this request. If omitted or unknown,
   * the main process falls back to the default built-in agent.
   */
  agentId?: string
}

// Chat request interface - discriminated union for different provider types
export type ChatRequest =
  | (BaseChatRequest & {
      provider: LocalProviderId
      endpointURL: string
    })
  | (BaseChatRequest & {
      provider: GatewayProviderId
      endpointURL: string
    })
  | (BaseChatRequest & {
      provider: Exclude<string, LocalProviderId | GatewayProviderId>
      apiKey: string
    })

// Chat provider configuration with functions
export type ChatProvider =
  | (ChatProviderInfo & {
      id: 'ollama' | 'lmstudio'
      createModel: (modelId: string, endpointURL: string) => LanguageModel
    })
  | (ChatProviderInfo & {
      id: GatewayProviderId
      createModel: (modelId: string, endpointURL: string) => LanguageModel
    })
  | (ChatProviderInfo & {
      id: Exclude<string, LocalProviderId | GatewayProviderId>
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
    uiResourceUri?: string
  }>
  isRunning: boolean
}
