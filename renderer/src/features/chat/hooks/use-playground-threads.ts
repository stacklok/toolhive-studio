import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { trackEvent } from '@/common/lib/analytics'
import { generateDraftThreadId } from '@/features/chat/lib/thread-id'

export interface PlaygroundThread {
  id: string
  title?: string
  starred?: boolean
  lastEditTimestamp: number
  createdAt: number
  /** Renderer-only draft: promoted to a real DB row on first send. */
  pending?: boolean
}

const sortByRecent = (a: PlaygroundThread, b: PlaygroundThread) =>
  b.lastEditTimestamp - a.lastEditTimestamp

export function usePlaygroundThreads(activeThreadId: string | null) {
  const queryClient = useQueryClient()
  const [threads, setThreads] = useState<PlaygroundThread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Mirror the latest values into refs via effects so callbacks/effects
  // can read them without re-binding on every change.
  const threadsRef = useRef(threads)
  useEffect(() => {
    threadsRef.current = threads
  })
  // Read by the load effect without becoming a dep (would refetch on URL change).
  const activeThreadIdRef = useRef(activeThreadId)
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId
  })

  useEffect(() => {
    async function loadThreads() {
      try {
        setIsLoading(true)
        const allThreads = await window.electronAPI.chat.getAllThreads()
        const sorted = [...allThreads].sort(
          (a, b) => b.lastEditTimestamp - a.lastEditTimestamp
        )
        const lightweight: PlaygroundThread[] = sorted.map(
          ({ id, title, starred, lastEditTimestamp, createdAt }) => ({
            id,
            title,
            starred,
            lastEditTimestamp,
            createdAt,
          })
        )
        // Seed the URL-driven id as a pending draft if not in the DB
        // (fresh visit / deep-link). Atomic with the load so the persist
        // effect below sees it on first run and skips the noisy IPC.
        const initialActive = activeThreadIdRef.current
        if (initialActive && !lightweight.some((t) => t.id === initialActive)) {
          const now = Date.now()
          lightweight.unshift({
            id: initialActive,
            title: undefined,
            lastEditTimestamp: now,
            createdAt: now,
            pending: true,
          })
        }
        setThreads(lightweight)
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to load threads:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadThreads()
  }, [])

  // Persist the URL-driven active thread to main. Skip pending drafts —
  // their row doesn't exist yet and the IPC would reject with
  // `Thread not found`. Promotion flips `pending` (via `refreshThread`)
  // and re-runs this effect.
  const isActivePending = activeThreadId
    ? (threads.find((t) => t.id === activeThreadId)?.pending ?? false)
    : false

  useEffect(() => {
    if (isLoading) return
    if (!activeThreadId) {
      window.electronAPI.chat.setActiveThreadId(undefined)
      return
    }
    if (isActivePending) return
    window.electronAPI.chat.setActiveThreadId(activeThreadId)
  }, [activeThreadId, isActivePending, isLoading])

  // Seed unknown ids that arrive post-load (deep link, manual URL edit).
  // Initial mount is handled atomically inside the loader above.
  // Using the "adjusting state on prop change" pattern: setState during
  // render when the tracked id flips, instead of a setState-in-effect.
  const [seededActiveId, setSeededActiveId] = useState<string | null>(null)
  if (!isLoading && activeThreadId && seededActiveId !== activeThreadId) {
    setSeededActiveId(activeThreadId)
    setThreads((prev) => {
      if (prev.some((t) => t.id === activeThreadId)) return prev
      const now = Date.now()
      const seed: PlaygroundThread = {
        id: activeThreadId,
        title: undefined,
        lastEditTimestamp: now,
        createdAt: now,
        pending: true,
      }
      return [seed, ...prev]
    })
  }

  /** Reuses an existing pending draft to avoid piling up empty entries. */
  const findReusableDraftId = useCallback((): string | null => {
    const draft = threadsRef.current.find((t) => t.pending)
    return draft?.id ?? null
  }, [])

  /**
   * Returns an existing or newly-generated draft id. No IPC — the row is
   * written on first send via `ensureThreadExists` in `use-chat-streaming`.
   */
  const createThread = useCallback(async (): Promise<string | null> => {
    const reusable = findReusableDraftId()
    if (reusable) return reusable

    const id = generateDraftThreadId()
    const now = Date.now()
    const draft: PlaygroundThread = {
      id,
      title: undefined,
      lastEditTimestamp: now,
      createdAt: now,
      pending: true,
    }
    setThreads((prev) => [draft, ...prev])
    trackEvent('Playground: create thread')
    return id
  }, [findReusableDraftId])

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
        // Pending drafts only exist in renderer state — skip the IPC.
        const isPending = threadsRef.current.find(
          (t) => t.id === threadId
        )?.pending
        if (!isPending) {
          const result = await window.electronAPI.chat.deleteThread(threadId)
          if (!result.success) {
            log.error(
              '[usePlaygroundThreads] Failed to delete thread:',
              result.error
            )
            return { success: false }
          }
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
          { threadId: string; timestamp: number } | undefined
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

  // Refresh when a background stream finishes, or when main writes a
  // title after stream end (title work runs after the `finished` broadcast).
  useEffect(() => {
    const signalStreamingComplete = (threadId: string) => {
      queryClient.setQueryData(['chat', 'streamingComplete'], {
        threadId,
        timestamp: Date.now(),
      })
    }

    const onStreamState = (...args: unknown[]) => {
      const event = args[0] as { chatId?: string; status?: string } | undefined
      if (!event?.chatId || event.status !== 'finished') return
      signalStreamingComplete(event.chatId)
    }

    const onThreadUpdated = (...args: unknown[]) => {
      const event = args[0] as { threadId?: string } | undefined
      if (!event?.threadId) return
      signalStreamingComplete(event.threadId)
    }

    const offState = window.electronAPI.on?.('chat:stream:state', onStreamState)
    const offUpdated = window.electronAPI.on?.(
      'chat:thread:updated',
      onThreadUpdated
    )
    return () => {
      offState?.()
      offUpdated?.()
    }
  }, [queryClient])

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
