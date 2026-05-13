import { useCallback, useMemo, useEffect, useState, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { toast } from 'sonner'
import type { ChatUIMessage } from '../types'
import { ElectronIPCChatTransport } from '../transport/electron-ipc-chat-transport'
import { useChatSettings } from './use-chat-settings'
import { useThreadManagement } from './use-thread-management'
import type { FileUIPart } from 'ai'
import { trackEvent } from '@/common/lib/analytics'
import { hasValidCredentials } from '../lib/utils'
import { chatThreadQueryOptions } from '../lib/thread-query'

/**
 * Strip the SQLite snapshot's trailing assistant message when a live
 * stream is about to replay a synthesized version of the same one.
 * Without this, the AI SDK's `processUIMessageStream` lands `text-start`
 * onto a message that already has a text part, producing duplicates.
 */
function dropTrailingAssistant(messages: ChatUIMessage[]): ChatUIMessage[] {
  if (messages.at(-1)?.role !== 'assistant') return messages
  return messages.slice(0, -1)
}

/**
 * A message the user submitted while a stream was active, held in renderer
 * memory until the current stream finishes (or until the user cancels).
 *
 * Single slot per thread — submitting a new message while one is already
 * queued replaces it, matching a "draft" mental model. Lost on app restart
 * (in-memory only; no SQLite persistence in V1).
 */
type QueuedMessage = { text: string; files?: FileUIPart[] }

export function useChatStreaming(externalThreadId?: string | null) {
  const queryClient = useQueryClient()
  const [persistentError, setPersistentError] = useState<string | null>(null)
  const [queuedMessage, setQueuedMessage] = useState<QueuedMessage | null>(null)

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

    const threadIdAtResume = currentThreadId
    ;(async () => {
      // Peek the registry first. When a stream is live, the SQLite
      // snapshot's trailing assistant message is the same one the
      // synthesized replay is about to rebuild — keeping it would let
      // `processUIMessageStream` pile a second copy of every part on
      // top of it. Drop it; the replay's `start { messageId }` creates
      // a fresh assistant that the live tail extends.
      let activeStreamId: string | null = null
      try {
        activeStreamId =
          await window.electronAPI.chat.getActiveStreamId(threadIdAtResume)
      } catch {
        activeStreamId = null
      }
      if (hydratedThreadRef.current !== threadIdAtResume) return
      const messagesToSet = activeStreamId
        ? dropTrailingAssistant(threadData.messages)
        : threadData.messages
      setMessages(messagesToSet)

      await resumeStream()
      if (hydratedThreadRef.current !== threadIdAtResume) {
        try {
          void window.electronAPI.chat.unsubscribeStream(threadIdAtResume)
        } catch {
          // best effort
        }
        return
      }
      // Race guard: we trimmed the trailing assistant on the assumption
      // a stream was live, but it finished between the peek and the
      // resume call. `resumeStream()` itself returns `void`, so re-poke
      // the registry and refetch the now-finalized snapshot if the
      // stream is gone — `setMessages` will replay over the trimmed list.
      if (activeStreamId) {
        let stillActive: string | null = activeStreamId
        try {
          stillActive =
            await window.electronAPI.chat.getActiveStreamId(threadIdAtResume)
        } catch {
          stillActive = null
        }
        if (!stillActive) {
          // Allow re-hydration when the refetch lands — we trimmed the
          // trailing assistant assuming a live replay, but the stream is
          // gone. Without clearing the ref, the guard at the top of this
          // effect would skip the next run and the UI would stay missing
          // the final assistant turn until reload.
          hydratedThreadRef.current = null
          try {
            void queryClient.invalidateQueries({
              queryKey: chatThreadQueryOptions(threadIdAtResume).queryKey,
            })
          } catch {
            // best effort
          }
        }
      }
    })()
  }, [currentThreadId, threadData, setMessages, resumeStream, queryClient])

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

  // One-shot warning if the main process can't persist a snapshot
  // (disk full, SQLite locked, …). Main emits this once per stream.
  useEffect(() => {
    if (!currentThreadId) return
    const listener = (...args: unknown[]) => {
      const event = args[0] as { chatId?: string; error?: string } | undefined
      if (!event || event.chatId !== currentThreadId) return
      toast.warning('Your chat may not be saved — saving to disk failed.', {
        description: event.error,
      })
    }
    const unsubscribe = window.electronAPI.on?.(
      'chat:stream:persist-error',
      listener
    )
    return () => {
      unsubscribe?.()
    }
  }, [currentThreadId])

  // Drop any queued message when the user switches threads — the queue is
  // per-thread and we never auto-send across threads. Done in an effect so
  // both `externalThreadId` (prop-driven) and the resolved `currentThreadId`
  // changes are honored — `currentThreadId` is the source of truth.
  useEffect(() => {
    setQueuedMessage(null)
  }, [currentThreadId])

  // Auto-fire the queued message when the active stream finishes.
  //
  // We watch the `streaming`/`submitted` → other-state transition rather
  // than just "status is idle". Without that, mounting with `status='ready'`
  // and a stale queue would flush immediately, and resume-from-snapshot
  // races could fire twice.
  //
  // Important: we deliberately call the AI SDK's `sendMessage` directly
  // here (NOT `validatedSendMessage`) — re-running validation on the auto-
  // flush path would re-queue the message into oblivion. The settings were
  // already valid when the user submitted (otherwise the validation in
  // `validatedSendMessage` would have thrown), so re-validation is moot.
  //
  // If status flips to `error` (not `ready`), we leave the queue intact so
  // the user can cancel or retry once the error is resolved. Auto-firing
  // onto a broken provider would just produce a second error.
  const prevQueueStatusRef = useRef(status)
  useEffect(() => {
    const prev = prevQueueStatusRef.current
    prevQueueStatusRef.current = status
    const wasStreaming = prev === 'streaming' || prev === 'submitted'
    const nowIdle = status === 'ready'
    if (!wasStreaming || !nowIdle) return
    if (!queuedMessage) return
    const toSend = queuedMessage
    setQueuedMessage(null)
    // Fire-and-forget — `sendMessage` returns a Promise, but the AI SDK
    // surfaces failures via `error` which we already render in `ErrorAlert`.
    Promise.resolve(sendMessage(toSend)).catch((err) => {
      log.error('[useChatStreaming] Auto-flush of queued message failed:', err)
    })
  }, [status, queuedMessage, sendMessage])

  const cancelQueuedMessage = useCallback(() => {
    setQueuedMessage(null)
  }, [])

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

  /**
   * Validate settings, promote the draft thread to a DB row if needed,
   * then call the AI SDK's `sendMessage` directly. Used by both the
   * normal-send path (after queue check) and the rewind path. Does NOT
   * touch the queue — callers that need queue-while-streaming behavior
   * go through {@link validatedSendMessage}.
   */
  const dispatchSend = useCallback(
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

      // Promote a renderer-side draft to a real DB row before the
      // stream starts — `runManagedStream` writes snapshots via
      // `updateThreadMessages`, which needs the row to exist.
      if (currentThreadId) {
        const ensured =
          await window.electronAPI.chat.ensureThreadExists(currentThreadId)
        if (!ensured.success) {
          throw new Error(ensured.error ?? 'Failed to create chat thread')
        }
      }

      if (typeof messageOrText === 'string') {
        return sendMessage({ text: messageOrText })
      } else {
        return sendMessage(messageOrText)
      }
    },
    [settings, sendMessage, currentThreadId]
  )

  const validatedSendMessage = useCallback(
    async (
      messageOrText:
        | string
        | {
            text: string
            files?: FileUIPart[]
          }
    ) => {
      // Queue-while-streaming: hold the message in renderer memory and
      // auto-fire it when the current stream finishes. Validation still
      // runs first (via `dispatchSend` below for the immediate path; we
      // mirror its settings check here so a misconfigured queue submit
      // surfaces the error to the user immediately).
      //
      // The rewind-and-retry path bypasses this entirely by calling
      // `dispatchSend` directly — see `rewindAndResend`.
      if (status === 'streaming' || status === 'submitted') {
        if (
          !settings.provider ||
          !settings.model ||
          !hasValidCredentials(settings)
        ) {
          throw new Error('Please configure your AI provider settings first')
        }
        const queued: QueuedMessage =
          typeof messageOrText === 'string'
            ? { text: messageOrText }
            : messageOrText
        setQueuedMessage(queued)
        return
      }

      return dispatchSend(messageOrText)
    },
    [dispatchSend, settings, status]
  )

  /**
   * Id of the most recent user message in the thread, or `null` if no user
   * message exists yet. Drives the "rewind & retry" affordance in the
   * composer — only the LAST user message can be rewound during streaming.
   */
  const lastUserMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i]
      if (m && m.role === 'user') return m.id
    }
    return null
  }, [messages])

  /**
   * Cancel the in-flight stream, drop the user message being edited AND the
   * partial assistant response that was being generated for it, then send
   * the new text as a fresh message — replacing the in-flight turn with the
   * edited one.
   *
   * Caller MUST guard that `editingMessageId === lastUserMessageId` and a
   * stream is active. If `editingMessageId` doesn't match anything in
   * `messages` we fall back to a normal `sendMessage` (defensive — this
   * shouldn't happen given the UI guard).
   */
  const rewindAndResend = useCallback(
    async ({
      text,
      files,
      editingMessageId,
    }: {
      text: string
      files?: FileUIPart[]
      editingMessageId: string
    }): Promise<void> => {
      if (
        !settings.provider ||
        !settings.model ||
        !hasValidCredentials(settings)
      ) {
        throw new Error('Please configure your AI provider settings first')
      }

      if (editingMessageId !== lastUserMessageId) {
        throw new Error(
          'rewindAndResend only supports the last user message; got id ' +
            `${editingMessageId} (last is ${lastUserMessageId ?? 'none'})`
        )
      }

      const idx = messages.findIndex((m) => m.id === editingMessageId)
      if (idx === -1) {
        // Defensive fallback — UI shouldn't let us get here. Bypass the
        // queue intercept by going through `dispatchSend` directly; the
        // rewind path is exclusive of the queue path and should never
        // land a "send" in the queued slot.
        await dispatchSend({ text, files })
        return
      }

      // 1. Stop the active main-process stream first so it doesn't keep
      // pushing chunks (and persisting partial snapshots) while we trim.
      if (currentThreadId) {
        try {
          await window.electronAPI.chat.cancelStream(currentThreadId)
        } catch {
          // best effort — we still tear down the renderer-side state below
        }
      }
      await stop()
      clearError()

      // 2. Drop the edited user message AND everything after it (the
      // partial assistant response). `setMessages` updates the renderer's
      // local view immediately.
      const trimmed = messages.slice(0, idx)
      setMessages(trimmed)

      // 3. Overwrite the SQLite snapshot so a mid-flight navigation can't
      // resurrect the partial state. The active stream's `finalizeError`
      // path may have raced a snapshot write through `flushPersist`; this
      // overwrite is the source of truth from the user's perspective.
      if (currentThreadId) {
        try {
          await window.electronAPI.chat.updateThreadMessages(
            currentThreadId,
            trimmed
          )
        } catch (err) {
          log.error(
            '[useChatStreaming] Failed to persist trimmed messages:',
            err
          )
        }
      }

      // 4. Start the new stream. Use `dispatchSend` (not
      // `validatedSendMessage`) so the in-flight `status === 'streaming'`
      // closure value doesn't route this send into the queue. The
      // captured `status` won't update synchronously after `stop()` —
      // routing the rewind through `validatedSendMessage` here would
      // queue the edited message and then auto-flush it on the next
      // tick, which is observably the same outcome but adds an extra
      // round-trip and a misleading "Queued" chip flash for the user.
      // We discard the AI SDK's sendMessage return — no caller reads it.
      await dispatchSend({ text, files })
    },
    [
      settings,
      lastUserMessageId,
      messages,
      currentThreadId,
      stop,
      clearError,
      setMessages,
      dispatchSend,
    ]
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
      rewindAndResend,
      lastUserMessageId,
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
      queuedMessage,
      cancelQueuedMessage,
    }
  }, [
    status,
    messages,
    isLoading,
    processedError,
    settings,
    validatedSendMessage,
    rewindAndResend,
    lastUserMessageId,
    clearMessages,
    updateSettings,
    updateEnabledTools,
    loadPersistedSettings,
    isPersistentLoading,
    clearError,
    stop,
    currentThreadId,
    queuedMessage,
    cancelQueuedMessage,
  ])
}
