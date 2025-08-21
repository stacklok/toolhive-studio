import { useCallback, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { ChatContext, type ChatContextValue } from './use-chat-context'
import type { ChatUIMessage } from '../types'

interface ChatProviderProps {
  children: ReactNode
}

const CHAT_STORAGE_KEY = 'toolhive-chat-messages'

export function ChatProvider({ children }: ChatProviderProps) {
  // We'll implement this using the existing useChatStreaming hook
  // but expose it through context to avoid prop drilling
  const chatState = useChatStreaming()
  const hasLoadedFromStorage = useRef(false)

  // Use refs to store current values without causing re-renders
  const chatStateRef = useRef(chatState)
  chatStateRef.current = chatState

  // Load from sessionStorage on mount - only run once
  useEffect(() => {
    const loadFromStorage = async () => {
      if (!hasLoadedFromStorage.current) {
        hasLoadedFromStorage.current = true
        try {
          const savedMessages = sessionStorage.getItem(CHAT_STORAGE_KEY)
          if (savedMessages) {
            const messages: ChatUIMessage[] = JSON.parse(savedMessages)
            if (messages.length > 0 && chatStateRef.current.setMessages) {
              chatStateRef.current.setMessages(messages)
            }
          }
        } catch (error) {
          console.error(
            'Failed to load chat messages from sessionStorage:',
            error
          )
        }
      }
    }

    loadFromStorage()
  }, []) // Empty dependency array - only run once on mount

  // Save to sessionStorage when messages change
  useEffect(() => {
    try {
      if (chatState.messages.length > 0) {
        sessionStorage.setItem(
          CHAT_STORAGE_KEY,
          JSON.stringify(chatState.messages)
        )
      } else {
        sessionStorage.removeItem(CHAT_STORAGE_KEY)
      }
    } catch (error) {
      console.error('Failed to save chat messages to sessionStorage:', error)
    }
  }, [chatState.messages])

  // Create a stable updateEnabledTools function using refs
  const updateEnabledTools = useCallback(async (tools: string[]) => {
    // Get the current settings at call time using ref
    const currentSettings = chatStateRef.current.settings
    await chatStateRef.current.updateSettings({
      ...currentSettings,
      enabledTools: tools,
    })
  }, [])

  // Enhanced clearMessages that also clears sessionStorage
  const clearMessages = useCallback(() => {
    chatStateRef.current.clearMessages()
    sessionStorage.removeItem(CHAT_STORAGE_KEY)
  }, [])

  // Create context value without useMemo to avoid dependency issues
  const contextValue: ChatContextValue = {
    ...chatState,
    updateEnabledTools,
    clearMessages, // Use our enhanced version
  }

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  )
}

// We need to import this here to avoid circular dependency
import { useChatStreaming } from '../hooks/use-chat-streaming'
