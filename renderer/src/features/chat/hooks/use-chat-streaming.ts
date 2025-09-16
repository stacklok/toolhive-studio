import { useCallback, useMemo, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import type { ChatUIMessage } from '../types'
import { ElectronIPCChatTransport } from '../transport/electron-ipc-chat-transport'
import { useChatSettings } from './use-chat-settings'
import { useThreadManagement } from './use-thread-management'

export function useChatStreaming() {
  const queryClient = useQueryClient()
  const [isPersistentLoading, setIsPersistentLoading] = useState(true)
  const [persistentError, setPersistentError] = useState<string | null>(null)

  const {
    settings,
    updateSettings,
    updateEnabledTools,
    loadPersistedSettings,
    isLoading: isSettingsLoading,
  } = useChatSettings()

  // Use dedicated thread management hook
  const {
    currentThreadId,
    isLoading: isThreadLoading,
    error: threadError,
    loadMessages: loadThreadMessages,
    clearMessages: clearThreadMessages,
  } = useThreadManagement()

  const ipcTransport = useMemo(
    () =>
      new ElectronIPCChatTransport({
        queryClient,
      }),
    [queryClient]
  )

  const { messages, sendMessage, status, error, stop, setMessages } =
    useChat<ChatUIMessage>({
      id: currentThreadId || 'loading-thread',
      transport: ipcTransport,
      experimental_throttle: 200,
    })

  useEffect(() => {
    async function loadInitialMessages() {
      if (!currentThreadId) return

      try {
        setIsPersistentLoading(true)
        setPersistentError(null)

        const persistedMessages = await loadThreadMessages()
        setMessages(persistedMessages)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load chat history'
        setPersistentError(errorMessage)
        log.error('Failed to load persistent chat messages:', err)
      } finally {
        setIsPersistentLoading(false)
      }
    }

    loadInitialMessages()
  }, [currentThreadId, loadThreadMessages, setMessages])

  // Convert status to our isLoading format
  const isLoading =
    status === 'submitted' ||
    status === 'streaming' ||
    isSettingsLoading ||
    isPersistentLoading ||
    isThreadLoading

  const handleSendMessage = useCallback(
    async (content: string) => {
      // Validate settings before sending to prevent transport errors
      if (!settings.provider || !settings.model || !settings.apiKey?.trim()) {
        throw new Error('Please configure your AI provider settings first')
      }

      await sendMessage({ text: content })
    },
    [sendMessage, settings.provider, settings.model, settings.apiKey]
  )

  const clearMessages = useCallback(async () => {
    try {
      // Clear both UI state and persistent storage
      await clearThreadMessages()
      setMessages([])
      setPersistentError(null)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to clear chat history'
      setPersistentError(errorMessage)
      log.error('Failed to clear persistent chat:', err)
    }
  }, [setMessages, clearThreadMessages])

  // Process error to handle different error formats
  const processError = (error: unknown): string | null => {
    if (!error) return null

    log.error(error)

    if (typeof error === 'string') return error

    if (error instanceof Error) return error.message

    if (typeof error === 'object' && error !== null) {
      // Try to extract message from various possible structures
      if ('message' in error && typeof error.message === 'string') {
        return error.message
      }
      if ('error' in error && typeof error.error === 'string') {
        return error.error
      }
      try {
        const errorObj = error as Record<string, unknown>
        if (errorObj.type === 'overloaded_error') {
          return 'The AI service is currently overloaded. Please try again in a few moments.'
        }
        // For other structured errors, return the JSON string as fallback
        return JSON.stringify(error)
      } catch {
        return 'An unknown error occurred'
      }
    }

    return 'An unknown error occurred'
  }

  // Memoize the processed error to avoid recalculating on every render
  const processedError = useMemo(() => {
    // Prioritize persistent error, then thread error, then streaming error
    return persistentError || threadError || processError(error)
  }, [error, persistentError, threadError])

  return useMemo(() => {
    return {
      messages,
      isLoading,
      error: processedError,
      settings,
      sendMessage: handleSendMessage,
      clearMessages,
      cancelRequest: stop,
      updateSettings,
      updateEnabledTools,
      loadPersistedSettings,
      isPersistentLoading,
    }
  }, [
    messages,
    isLoading,
    processedError,
    settings,
    handleSendMessage,
    clearMessages,
    stop,
    updateSettings,
    updateEnabledTools,
    loadPersistedSettings,
    isPersistentLoading,
  ])
}
