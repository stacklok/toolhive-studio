import { useState, useEffect, useCallback, useRef } from 'react'
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

export function usePlaygroundThreads(activeThreadId: string | null) {
  const queryClient = useQueryClient()
  const [threads, setThreads] = useState<PlaygroundThread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const threadsRef = useRef(threads)
  threadsRef.current = threads

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
    if (activeThreadId) {
      window.electronAPI.chat.setActiveThreadId(activeThreadId)
    }
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
   * Deletes a thread. On success returns `{ success: true, nextId }` where
   * `nextId` is the next thread ID for navigation (or `null` when no threads
   * remain). On failure returns `{ success: false }` so the caller can
   * distinguish "the thread was deleted and had no neighbors" from "the
   * delete failed and the thread still exists" — important for side effects
   * like clearing persisted drafts.
   */
  const deleteThread = useCallback(
    async (
      threadId: string
    ): Promise<
      { success: true; nextId: string | null } | { success: false }
    > => {
      try {
        const result = await window.electronAPI.chat.deleteThread(threadId)
        if (!result.success) {
          log.error(
            '[usePlaygroundThreads] Failed to delete thread:',
            result.error
          )
          return { success: false }
        }
        trackEvent('Playground: delete thread', {
          'thread.was_active': activeThreadId === threadId,
        })
        // Read from ref to get the latest threads snapshot and avoid
        // overwriting concurrent state updates (e.g. from refreshThread).
        const remaining = threadsRef.current.filter((t) => t.id !== threadId)
        setThreads(remaining)
        return { success: true, nextId: remaining[0]?.id ?? null }
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to delete thread:', err)
        return { success: false }
      }
    },
    [activeThreadId]
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
          // Invalidate the loader-primed thread query so the next
          // navigation (or preload) sees fresh messages/title.
          queryClient.invalidateQueries({
            queryKey: ['chat', 'thread', data.threadId],
          })
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
