import { useState, useEffect, useCallback } from 'react'
import log from 'electron-log/renderer'

/**
 * Small hook that resolves the "current" thread id.
 *
 * Historically this hook also loaded messages from IPC, but that is now
 * owned by the `/playground/chat/$threadId` route loader + React Query
 * (see `chatThreadQueryOptions`). Here we just mirror the prop-provided
 * thread id and, if none is provided, fall back to the most-recent thread
 * or create a new one (legacy callers that render `ChatInterface` outside
 * the route).
 */
export function useThreadManagement(externalThreadId?: string | null) {
  const isLegacy = externalThreadId === undefined
  // Auto-select state is only used in the legacy path. When an external
  // threadId is provided we derive `currentThreadId` from it directly so
  // no mirroring effect is needed.
  const [autoThreadId, setAutoThreadId] = useState<string | null>(null)
  const [autoIsLoading, setAutoIsLoading] = useState(isLegacy)
  const [error, setError] = useState<string | null>(null)

  const currentThreadId = isLegacy ? autoThreadId : externalThreadId
  const isLoading = isLegacy ? autoIsLoading : false

  useEffect(() => {
    // External path: nothing to do — `currentThreadId` is derived above.
    if (!isLegacy) return

    // Legacy auto-select behavior (used when no threadId is passed)
    async function getCurrentThread() {
      try {
        setAutoIsLoading(true)
        setError(null)

        const allThreads = await window.electronAPI.chat.getAllThreads()

        if (allThreads && allThreads.length > 0) {
          const mostRecentThread = allThreads.reduce((latest, current) => {
            return current.lastEditTimestamp > latest.lastEditTimestamp
              ? current
              : latest
          })

          setAutoThreadId(mostRecentThread.id)
          window.electronAPI.chat.setActiveThreadId(mostRecentThread.id)
        } else {
          const result = await window.electronAPI.chat.createChatThread('Chat')
          if (result.success && result.threadId) {
            setAutoThreadId(result.threadId)
          } else {
            log.error(`[THREAD] Failed to create thread: ${result.threadId}`)
            throw new Error(result.error || 'Failed to create thread')
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to get current thread'
        setError(errorMessage)
        log.error('Failed to get current thread:', err)
      } finally {
        setAutoIsLoading(false)
      }
    }

    getCurrentThread()
  }, [isLegacy])

  const clearMessages = useCallback(async () => {
    if (!currentThreadId) return

    try {
      const result = await window.electronAPI.chat.updateThreadMessages(
        currentThreadId,
        []
      )
      if (!result.success) {
        console.error('Failed to clear thread:', result.error)
        throw new Error(result.error || 'Failed to clear thread')
      }
    } catch (err) {
      log.error('Failed to clear thread messages:', err)
      throw err
    }
  }, [currentThreadId])

  return {
    currentThreadId,
    isLoading,
    error,
    clearMessages,
  }
}
