import { useState, useEffect, useCallback } from 'react'
import log from 'electron-log/renderer'
import type { ChatUIMessage } from '../types'

export function useThreadManagement(externalThreadId?: string | null) {
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(
    externalThreadId ?? null
  )
  const [isLoading, setIsLoading] = useState(externalThreadId === undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If an external threadId is provided, use it directly
    if (externalThreadId !== undefined) {
      setCurrentThreadId(externalThreadId)
      setIsLoading(false)
      return
    }

    // Legacy auto-select behavior (used when no threadId is passed)
    async function getCurrentThread() {
      try {
        setIsLoading(true)
        setError(null)

        const allThreads = await window.electronAPI.chat.getAllThreads()

        if (allThreads && allThreads.length > 0) {
          const mostRecentThread = allThreads.reduce((latest, current) => {
            return current.lastEditTimestamp > latest.lastEditTimestamp
              ? current
              : latest
          })

          setCurrentThreadId(mostRecentThread.id)
          window.electronAPI.chat.setActiveThreadId(mostRecentThread.id)
        } else {
          const result = await window.electronAPI.chat.createChatThread('Chat')
          if (result.success && result.threadId) {
            setCurrentThreadId(result.threadId)
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
        setIsLoading(false)
      }
    }

    getCurrentThread()
  }, [externalThreadId])

  const loadMessages = useCallback(async (): Promise<ChatUIMessage[]> => {
    if (!currentThreadId) {
      return []
    }

    try {
      const messages =
        await window.electronAPI.chat.getThreadMessagesForTransport(
          currentThreadId
        )
      return messages || []
    } catch (err) {
      log.error('Failed to load messages:', err)
      return []
    }
  }, [currentThreadId])

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
    loadMessages,
    clearMessages,
  }
}
