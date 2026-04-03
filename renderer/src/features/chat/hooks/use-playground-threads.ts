import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'

export interface PlaygroundThread {
  id: string
  title?: string
  starred?: boolean
  lastEditTimestamp: number
  createdAt: number
}

export function usePlaygroundThreads() {
  const queryClient = useQueryClient()
  const [threads, setThreads] = useState<PlaygroundThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
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

        if (lightweight.length > 0 && lightweight[0]) {
          setActiveThreadId(lightweight[0].id)
          window.electronAPI.chat.setActiveThreadId(lightweight[0].id)
        }
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to load threads:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadThreads()
  }, [])

  const createThread = useCallback(async () => {
    try {
      const result = await window.electronAPI.chat.createChatThread()
      if (!result.success || !result.threadId) {
        log.error(
          '[usePlaygroundThreads] Failed to create thread:',
          result.error
        )
        return
      }
      const now = Date.now()
      const newThread: PlaygroundThread = {
        id: result.threadId,
        title: undefined,
        lastEditTimestamp: now,
        createdAt: now,
      }
      setThreads((prev) => [newThread, ...prev])
      setActiveThreadId(result.threadId)
      window.electronAPI.chat.setActiveThreadId(result.threadId)
    } catch (err) {
      log.error('[usePlaygroundThreads] Failed to create thread:', err)
    }
  }, [])

  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId)
    window.electronAPI.chat.setActiveThreadId(threadId)
  }, [])

  const deleteThread = useCallback(
    async (threadId: string) => {
      try {
        const result = await window.electronAPI.chat.deleteThread(threadId)
        if (!result.success) {
          log.error(
            '[usePlaygroundThreads] Failed to delete thread:',
            result.error
          )
          return
        }
        setThreads((prev) => {
          const updated = prev.filter((t) => t.id !== threadId)
          if (activeThreadId === threadId) {
            const next = updated[0] ?? null
            setActiveThreadId(next?.id ?? null)
            if (next) {
              window.electronAPI.chat.setActiveThreadId(next.id)
            }
          }
          return updated
        })
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to delete thread:', err)
      }
    },
    [activeThreadId]
  )

  const updateThreadTitle = useCallback((threadId: string, title: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, title, lastEditTimestamp: Date.now() } : t
      )
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
          // New thread discovered — select it automatically
          setActiveThreadId(threadId)
          window.electronAPI.chat.setActiveThreadId(threadId)
          return [lightweight, ...prev]
        }
        return prev.map((t) => (t.id === threadId ? lightweight : t))
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
        event.query.queryKey[1] === 'streamingComplete'
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
    activeThreadId,
    isLoading,
    hasThreads: threads.length > 0,
    createThread,
    selectThread,
    deleteThread,
    updateThreadTitle,
    renameThread,
    toggleStarThread,
    refreshThread,
  }
}
