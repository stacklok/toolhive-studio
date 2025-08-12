export interface ChatProviderInfo {
  id: string
  name: string
  models: string[]
}

// For backward compatibility
export type ChatProvider = ChatProviderInfo

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatSettings {
  provider: string
  model: string
  apiKey: string
  enabledTools?: string[]
}
