import { useCallback, useMemo, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import type { ChatUIMessage } from '../types'
import { ElectronIPCChatTransport } from '../transport/electron-ipc-chat-transport'
import { useChatSettings } from './use-chat-settings'
import { useThreadManagement } from './use-thread-management'
import type { FileUIPart } from 'ai'
import { trackEvent } from '@/common/lib/analytics'
import { hasValidCredentials } from '../lib/utils'

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

  const {
    messages,
    sendMessage,
    status,
    error,
    clearError,
    stop,
    setMessages,
  } = useChat<ChatUIMessage>({
    id: currentThreadId || 'loading-thread',
    transport: ipcTransport,
    resume: false,
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

  const isLoading =
    status === 'submitted' ||
    status === 'streaming' ||
    isSettingsLoading ||
    isPersistentLoading ||
    isThreadLoading

  const clearMessages = useCallback(async () => {
    try {
      trackEvent('Playground: clear chat', {
        'chat.total_messages': messages.length,
      })
      await clearThreadMessages()
      setMessages([])
      setPersistentError(null)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to clear chat history'
      setPersistentError(errorMessage)
      log.error('Failed to clear persistent chat:', err)
    }
  }, [messages.length, clearThreadMessages, setMessages])

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

  const validatedSendMessage = useCallback(
    async (
      messageOrText:
        | string
        | {
            text: string
            files?: FileUIPart[]
          }
    ) => {
      if (
        !settings.provider ||
        !settings.model ||
        !hasValidCredentials(settings)
      ) {
        throw new Error('Please configure your AI provider settings first')
      }

      if (typeof messageOrText === 'string') {
        return sendMessage({ text: messageOrText })
      } else {
        return sendMessage(messageOrText)
      }
    },
    [settings, sendMessage]
  )

  // Memoize the processed error to avoid recalculating on every render
  const processedError = useMemo(() => {
    return persistentError || threadError || processError(error)
  }, [error, persistentError, threadError])

  return useMemo(() => {
    return {
      status,
      messages,
      isLoading,
      error: processedError,
      settings,
      sendMessage: validatedSendMessage,
      clearMessages,
      cancelRequest: async () => {
        await stop()
        clearError()
      },
      updateSettings,
      updateEnabledTools,
      loadPersistedSettings,
      isPersistentLoading,
    }
  }, [
    status,
    messages,
    isLoading,
    processedError,
    settings,
    validatedSendMessage,
    clearMessages,
    updateSettings,
    updateEnabledTools,
    loadPersistedSettings,
    isPersistentLoading,
    clearError,
    stop,
  ])
}
