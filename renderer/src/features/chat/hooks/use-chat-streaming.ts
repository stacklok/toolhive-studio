import { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import type { ChatUIMessage } from '../types'
import { ElectronIPCChatTransport } from '../transport/electron-ipc-chat-transport'
import { useChatSettings } from './use-chat-settings'
import { useThreadManagement } from './use-thread-management'
import type { FileUIPart } from 'ai'
import { trackEvent } from '@/common/lib/analytics'
import { hasValidCredentials } from '../lib/utils'
import { chatThreadQueryOptions } from '../lib/thread-query'

export function useChatStreaming(externalThreadId?: string | null) {
  const queryClient = useQueryClient()
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
    clearMessages: clearThreadMessages,
  } = useThreadManagement(externalThreadId)

  // Primed by the route loader via `ensureQueryData`, so available
  // synchronously on thread switch. Invalidated on streaming completion
  // by `usePlaygroundThreads`.
  const {
    data: threadData,
    isPending: isThreadDataPending,
    error: threadDataError,
  } = useQuery(chatThreadQueryOptions(currentThreadId))

  // Surface query failures via `persistentError` so they reach `processedError` below.
  useEffect(() => {
    if (!threadDataError) return
    const message =
      threadDataError instanceof Error
        ? threadDataError.message
        : 'Failed to load chat history'
    setPersistentError(message)
    log.error('Failed to load persistent chat messages:', threadDataError)
  }, [threadDataError])

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
    resumeStream,
  } = useChat<ChatUIMessage>({
    id: currentThreadId || 'loading-thread',
    transport: ipcTransport,
    // No `resume: true` on purpose — its on-mount auto-resume races our
    // hydration-driven resume on full route remounts and clobbers the
    // active response. We resume manually from the hydration effect below.
    experimental_throttle: 200,
  })

  // Hydrate `useChat` from the DB snapshot once per thread, then ask the
  // transport to reattach to any in-flight main-process stream. The ref
  // guards against later refetches overwriting live streaming state.
  const hydratedThreadRef = useRef<string | null>(null)
  useEffect(() => {
    if (!currentThreadId || !threadData) return
    if (hydratedThreadRef.current === currentThreadId) return
    hydratedThreadRef.current = currentThreadId
    setPersistentError(null)
    setMessages(threadData.messages)
    // Drop late subscriptions if the thread changed mid-flight, so we
    // don't stay attached to a stream we're no longer displaying.
    const threadIdAtResume = currentThreadId
    void Promise.resolve(resumeStream()).finally(() => {
      if (hydratedThreadRef.current !== threadIdAtResume) {
        try {
          void window.electronAPI.chat.unsubscribeStream(threadIdAtResume)
        } catch {
          // best effort
        }
      }
    })
  }, [currentThreadId, threadData, setMessages, resumeStream])

  // Detach on unmount / thread switch. The LLM call keeps running in
  // the main process; we just stop receiving chunks for it here.
  useEffect(() => {
    if (!currentThreadId) return
    return () => {
      try {
        void window.electronAPI.chat.unsubscribeStream(currentThreadId)
      } catch {
        // best effort
      }
    }
  }, [currentThreadId])

  const isPersistentLoading = !!currentThreadId && isThreadDataPending

  const isLoading =
    status === 'submitted' ||
    status === 'streaming' ||
    isSettingsLoading ||
    isPersistentLoading ||
    isThreadLoading

  // Signal the sidebar as soon as the user submits, before streaming starts.
  useEffect(() => {
    if (status === 'submitted' && currentThreadId) {
      queryClient.setQueryData(['chat', 'threadStarted'], {
        threadId: currentThreadId,
        timestamp: Date.now(),
      })
    }
  }, [status, currentThreadId, queryClient])

  // React to streaming completion: publish a signal and auto-title the thread via LLM
  const prevStatusRef = useRef(status)
  const titledThreadsRef = useRef<Set<string>>(new Set())

  /** Extracts plain text from a ChatUIMessage's parts */
  function extractUserText(msg: ChatUIMessage): string {
    return msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join(' ')
      .trim()
  }

  /** Emits the streamingComplete cache signal so subscribers refresh the thread */
  function signalStreamingComplete(threadId: string) {
    queryClient.setQueryData(['chat', 'streamingComplete'], {
      threadId,
      timestamp: Date.now(),
    })
  }

  useEffect(() => {
    const wasStreaming =
      prevStatusRef.current === 'streaming' ||
      prevStatusRef.current === 'submitted'
    prevStatusRef.current = status

    if (!wasStreaming || status === 'streaming' || status === 'submitted')
      return
    if (!currentThreadId) return

    // Publish initial signal so message list / loading state updates
    signalStreamingComplete(currentThreadId)

    // Auto-title: run once per thread per session (guard against concurrent calls)
    if (titledThreadsRef.current.has(currentThreadId)) return
    titledThreadsRef.current.add(currentThreadId)

    const threadIdAtCompletion = currentThreadId

    window.electronAPI.chat
      .getThread(threadIdAtCompletion)
      .then(async (thread) => {
        // Respect manually-edited titles
        if (thread?.titleEditedByUser) return

        // Optimistic placeholder: first user-message text, visible immediately
        const firstUserMsg = messages.find((m) => m.role === 'user')
        if (firstUserMsg) {
          const optimisticTitle = extractUserText(firstUserMsg).slice(0, 60)
          if (optimisticTitle) {
            await window.electronAPI.chat.updateThread(threadIdAtCompletion, {
              title: optimisticTitle,
              titleEditedByUser: false,
            })
            signalStreamingComplete(threadIdAtCompletion)
          }
        }

        return window.electronAPI.chat.generateThreadTitle(threadIdAtCompletion)
      })
      .then((result) => {
        if (result && !result.success) {
          log.warn('[useChatStreaming] Title generation failed:', result.error)
          return
        }
        // Re-publish after LLM title is written to DB
        if (result?.success) {
          signalStreamingComplete(threadIdAtCompletion)
        }
      })
      .catch((err) =>
        log.error('[useChatStreaming] Failed to auto-title thread:', err)
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentThreadId, queryClient])

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
        if (currentThreadId) {
          try {
            await window.electronAPI.chat.cancelStream(currentThreadId)
          } catch {
            // best effort: still tear down the renderer-side state below
          }
        }
        await stop()
        clearError()
      },
      updateSettings,
      updateEnabledTools,
      loadPersistedSettings,
      isPersistentLoading,
      currentThreadId,
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
    currentThreadId,
  ])
}
