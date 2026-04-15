import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { trackEvent } from '@/common/lib/analytics'

export interface PlaygroundThread {
  id: string
  title?: string
  starred?: boolean
  lastEditTimestamp: number
  createdAt: number
}

const sortByRecent = (a: PlaygroundThread, b: PlaygroundThread) =>
  b.lastEditTimestamp - a.lastEditTimestamp

export function usePlaygroundThreads(activeThreadId: string) {
  const queryClient = useQueryClient()
  const [threads, setThreads] = useState<PlaygroundThread[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadThreads() {
      try {
        setIsLoading(true)
        const allThreads = await window.electronAPI.chat.getAllThreads()
        const sorted = [...allThreads].sort(
          (a, b) => b.lastEditTimestamp - a.lastEditTimestamp
        )
        const lightweight = sorted.map(
          ({ id, title, starred, lastEditTimestamp, createdAt }) => ({
            id,
            title,
            starred,
            lastEditTimestamp,
            createdAt,
          })
        )
        setThreads(lightweight)
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to load threads:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadThreads()
  }, [])

  // Persist the URL-driven active thread to IPC whenever it changes
  useEffect(() => {
    window.electronAPI.chat.setActiveThreadId(activeThreadId)
  }, [activeThreadId])

  /** Creates a new thread and returns its ID for navigation, or null on failure. */
  const createThread = useCallback(async (): Promise<string | null> => {
    try {
      const result = await window.electronAPI.chat.createChatThread()
      if (!result.success || !result.threadId) {
        log.error(
          '[usePlaygroundThreads] Failed to create thread:',
          result.error
        )
        return null
      }
      const now = Date.now()
      const newThread: PlaygroundThread = {
        id: result.threadId,
        title: undefined,
        lastEditTimestamp: now,
        createdAt: now,
      }
      setThreads((prev) => [newThread, ...prev])
      trackEvent('Playground: create thread')
      return result.threadId
    } catch (err) {
      log.error('[usePlaygroundThreads] Failed to create thread:', err)
      return null
    }
  }, [])

  /**
   * Deletes a thread and returns the next thread ID for navigation,
   * or null when no threads remain.
   */
  const deleteThread = useCallback(
    async (threadId: string): Promise<string | null> => {
      try {
        const result = await window.electronAPI.chat.deleteThread(threadId)
        if (!result.success) {
          log.error(
            '[usePlaygroundThreads] Failed to delete thread:',
            result.error
          )
          return null
        }
        trackEvent('Playground: delete thread', {
          'thread.was_active': activeThreadId === threadId,
        })
        // Compute remaining list from current closure — avoids relying on
        // the functional updater running synchronously in React 18.
        const remaining = threads.filter((t) => t.id !== threadId)
        setThreads(remaining)
        return remaining[0]?.id ?? null
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to delete thread:', err)
        return null
      }
    },
    [activeThreadId, threads]
  )

  const updateThreadTitle = useCallback((threadId: string, title: string) => {
    setThreads((prev) =>
      prev
        .map((t) =>
          t.id === threadId ? { ...t, title, lastEditTimestamp: Date.now() } : t
        )
        .sort(sortByRecent)
    )
  }, [])

  const refreshThread = useCallback(async (threadId: string) => {
    try {
      const thread = await window.electronAPI.chat.getThread(threadId)
      if (!thread) return
      const lightweight = {
        id: thread.id,
        title: thread.title,
        starred: thread.starred,
        lastEditTimestamp: thread.lastEditTimestamp,
        createdAt: thread.createdAt,
      }
      setThreads((prev) => {
        const exists = prev.some((t) => t.id === threadId)
        if (!exists) {
          return [lightweight, ...prev].sort(sortByRecent)
        }
        return prev
          .map((t) => (t.id === threadId ? lightweight : t))
          .sort(sortByRecent)
      })
    } catch (err) {
      log.error('[usePlaygroundThreads] Failed to refresh thread:', err)
    }
  }, [])

  const renameThread = useCallback(
    async (threadId: string, title: string) => {
      try {
        await window.electronAPI.chat.updateThread(threadId, {
          title,
          titleEditedByUser: true,
        })
        await refreshThread(threadId)
        trackEvent('Playground: rename thread')
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to rename thread:', err)
      }
    },
    [refreshThread]
  )

  const toggleStarThread = useCallback(
    async (threadId: string) => {
      try {
        const thread = threads.find((t) => t.id === threadId)
        if (!thread) return
        const newStarred = !thread.starred
        await window.electronAPI.chat.updateThread(threadId, {
          starred: newStarred,
        })
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, starred: newStarred } : t
          )
        )
        trackEvent('Playground: toggle star', {
          'thread.starred': newStarred,
        })
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to toggle star:', err)
      }
    },
    [threads]
  )

  // Subscribe to the streaming-complete signal published by useChatStreaming
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.query.queryKey[0] === 'chat' &&
        (event.query.queryKey[1] === 'streamingComplete' ||
          event.query.queryKey[1] === 'threadStarted')
      ) {
        const data = event.query.state.data as
          | { threadId: string; timestamp: number }
          | undefined
        if (data?.threadId) {
          refreshThread(data.threadId).catch((err) =>
            log.error('[usePlaygroundThreads] refreshThread failed:', err)
          )
        }
      }
    })
  }, [queryClient, refreshThread])

  return {
    threads,
    isLoading,
    hasThreads: threads.length > 0,
    createThread,
    deleteThread,
    updateThreadTitle,
    renameThread,
    toggleStarThread,
    refreshThread,
  }
}
