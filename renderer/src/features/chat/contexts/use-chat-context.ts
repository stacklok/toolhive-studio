import { createContext, useContext } from 'react'
import type { ChatUIMessage, ChatSettings } from '../types'

export interface ChatContextValue {
  // Message state
  messages: ChatUIMessage[]
  isLoading: boolean
  error: string | null

  // Settings state
  settings: ChatSettings

  // Actions
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  cancelRequest: () => void
  updateSettings: (newSettings: ChatSettings) => Promise<void>
  loadPersistedSettings: (
    providerId: string,
    preserveEnabledTools?: boolean
  ) => Promise<void>
  updateEnabledTools: (tools: string[]) => Promise<void>
  setMessages?: (messages: ChatUIMessage[]) => void
}

export const ChatContext = createContext<ChatContextValue | undefined>(
  undefined
)

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
