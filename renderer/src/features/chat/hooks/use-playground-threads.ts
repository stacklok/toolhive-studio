import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { trackEvent } from '@/common/lib/analytics'
import { generateDraftThreadId } from '@/features/chat/lib/thread-id'
import { chatThreadQueryOptions } from '@/features/chat/lib/thread-query'
import { archivedThreadsQueryOptions } from '@/features/chat/lib/archived-threads-query'

export interface PlaygroundThread {
  id: string
  title?: string
  starred?: boolean
  lastEditTimestamp: number
  createdAt: number
  /** Renderer-only draft: promoted to a real DB row on first send. */
  pending?: boolean
}

type ThreadCursor = { ts: number; id: string }

/** Page size for the non-starred "Recents" list. */
const RECENT_THREADS_PAGE_SIZE = 50

const sortByRecent = (a: PlaygroundThread, b: PlaygroundThread) =>
  b.lastEditTimestamp - a.lastEditTimestamp || (a.id < b.id ? 1 : -1)

function toPlaygroundThread(summary: {
  id: string
  title?: string
  starred?: boolean
  lastEditTimestamp: number
  createdAt: number
}): PlaygroundThread {
  return {
    id: summary.id,
    title: summary.title,
    starred: summary.starred,
    lastEditTimestamp: summary.lastEditTimestamp,
    createdAt: summary.createdAt,
  }
}

function makePendingDraft(id: string): PlaygroundThread {
  const now = Date.now()
  return {
    id,
    title: undefined,
    lastEditTimestamp: now,
    createdAt: now,
    pending: true,
  }
}

/** Merges `incoming` into `prev` by id (incoming wins) and re-sorts. */
function mergeThreads(
  prev: PlaygroundThread[],
  incoming: PlaygroundThread[]
): PlaygroundThread[] {
  const byId = new Map(prev.map((t) => [t.id, t]))
  for (const t of incoming) byId.set(t.id, t)
  return [...byId.values()].sort(sortByRecent)
}

const THREAD_CHANGED_KEY = ['chat', 'threadChanged'] as const

/**
 * Asks every mounted `usePlaygroundThreads` to re-read `threadId` and drops
 * the cached full thread. Each route owns its own hook instance, so a
 * callback that outlives its route can't update the live sidebar directly.
 */
function signalThreadChanged(
  queryClient: ReturnType<typeof useQueryClient>,
  threadId: string
) {
  queryClient.setQueryData(THREAD_CHANGED_KEY, {
    threadId,
    timestamp: Date.now(),
  })
}

export function usePlaygroundThreads(activeThreadId: string | null) {
  const queryClient = useQueryClient()
  const [threads, setThreads] = useState<PlaygroundThread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [recentCursor, setRecentCursor] = useState<ThreadCursor | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
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

  /**
   * Writes the new archived state into the cached full thread. Invalidating
   * isn't enough: nothing observes the query once the user has left that
   * chat, so it isn't refetched, and the route loader's `ensureQueryData`
   * returns the stale copy. `resolveUnlistedThread` would then read
   * `archivedAt: null` and put an archived chat back in Recents.
   */
  const setCachedArchivedAt = useCallback(
    (threadId: string, archivedAt: number | null) => {
      queryClient.setQueryData(
        chatThreadQueryOptions(threadId).queryKey,
        (old) =>
          old?.thread ? { ...old, thread: { ...old.thread, archivedAt } } : old
      )
    },
    [queryClient]
  )

  /**
   * An id from the URL that isn't in the loaded list is either a real thread
   * outside the first page, an archived thread, or a brand-new draft. The
   * `/playground/chat/$threadId` loader has already put the thread in the
   * React Query cache, so this is a synchronous lookup. Returns the entry to
   * insert, or null when the id must stay out of the sidebar (archived).
   */
  const resolveUnlistedThread = useCallback(
    (id: string): PlaygroundThread | null => {
      const cached = queryClient.getQueryData(
        chatThreadQueryOptions(id).queryKey
      )
      const thread = cached?.thread
      if (!thread) return makePendingDraft(id)
      if (thread.archivedAt) return null
      return toPlaygroundThread(thread)
    },
    [queryClient]
  )

  useEffect(() => {
    async function loadThreads() {
      try {
        setIsLoading(true)
        // Summaries only — loading full threads here hydrated every
        // message of every chat just to render titles. Starred threads are
        // few and always shown; Recents are paged.
        const [starred, recent] = await Promise.all([
          window.electronAPI.chat.listThreads({ starred: true }),
          window.electronAPI.chat.listThreads({
            starred: false,
            limit: RECENT_THREADS_PAGE_SIZE,
          }),
        ])
        const lightweight = mergeThreads(
          [],
          [...starred.threads, ...recent.threads].map(toPlaygroundThread)
        )
        // Seed the URL-driven id if it isn't in the first page (fresh visit,
        // deep link, older thread). Atomic with the load so the persist
        // effect below sees it on first run and skips the noisy IPC.
        const initialActive = activeThreadIdRef.current
        if (initialActive && !lightweight.some((t) => t.id === initialActive)) {
          const seed = resolveUnlistedThread(initialActive)
          if (seed) lightweight.unshift(seed)
        }
        setThreads(lightweight.sort(sortByRecent))
        setRecentCursor(recent.nextCursor)
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to load threads:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadThreads()
  }, [resolveUnlistedThread])

  /** Appends the next page of Recents. No-op when there are no more. */
  const loadMoreThreads = useCallback(async () => {
    if (!recentCursor || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const page = await window.electronAPI.chat.listThreads({
        starred: false,
        limit: RECENT_THREADS_PAGE_SIZE,
        cursor: recentCursor,
      })
      setThreads((prev) =>
        // Don't let a stale page entry overwrite fresher local state
        // (renames, streaming refreshes) for ids already in the list.
        mergeThreads(
          prev,
          page.threads
            .filter((t) => !prev.some((p) => p.id === t.id))
            .map(toPlaygroundThread)
        )
      )
      setRecentCursor(page.nextCursor)
      trackEvent('Playground: load more threads')
    } catch (err) {
      log.error('[usePlaygroundThreads] Failed to load more threads:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [recentCursor, isLoadingMore])

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
      const seed = resolveUnlistedThread(activeThreadId)
      return seed ? mergeThreads(prev, [seed]) : prev
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

    const draft = makePendingDraft(generateDraftThreadId())
    setThreads((prev) => [draft, ...prev])
    trackEvent('Playground: create thread')
    return draft.id
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
        queryClient.invalidateQueries({
          queryKey: archivedThreadsQueryOptions().queryKey,
        })
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
    [activeThreadId, queryClient]
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
      const summary = await window.electronAPI.chat.getThreadSummary(threadId)
      if (!summary) return
      setThreads((prev) => {
        // Archived threads never live in the sidebar list, even if a
        // background stream finishes on one.
        if (summary.archivedAt) return prev.filter((t) => t.id !== threadId)
        return mergeThreads(prev, [toPlaygroundThread(summary)])
      })
    } catch (err) {
      log.error('[usePlaygroundThreads] Failed to refresh thread:', err)
    }
  }, [])

  /**
   * Archives a thread: it leaves the sidebar immediately and the IPC runs
   * in the background. Returns the neighbour to navigate to when the
   * archived thread was open, mirroring `deleteThread`.
   */
  const archiveThread = useCallback(
    async (
      threadId: string
    ): Promise<
      { success: true; nextId: string | null } | { success: false }
    > => {
      const current = threadsRef.current
      if (current.find((t) => t.id === threadId)?.pending) {
        return { success: false }
      }
      const remaining = current.filter((t) => t.id !== threadId)
      setThreads(remaining)
      try {
        const result = await window.electronAPI.chat.setThreadArchived(
          threadId,
          true
        )
        if (!result.success) throw new Error(result.error)
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to archive thread:', err)
        await refreshThread(threadId)
        return { success: false }
      }
      setCachedArchivedAt(threadId, Date.now())
      queryClient.invalidateQueries({
        queryKey: chatThreadQueryOptions(threadId).queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: archivedThreadsQueryOptions().queryKey,
      })
      trackEvent('Playground: archive thread', {
        'thread.was_active': activeThreadId === threadId,
      })
      return { success: true, nextId: remaining[0]?.id ?? null }
    },
    [activeThreadId, queryClient, refreshThread, setCachedArchivedAt]
  )

  const unarchiveThread = useCallback(
    async (threadId: string): Promise<boolean> => {
      try {
        const result = await window.electronAPI.chat.setThreadArchived(
          threadId,
          false
        )
        if (!result.success) throw new Error(result.error)
        setCachedArchivedAt(threadId, null)
        await refreshThread(threadId)
        // The Undo toast can outlive the route that archived the chat, so
        // also tell whichever sidebar is mounted now to pick it back up.
        signalThreadChanged(queryClient, threadId)
        queryClient.invalidateQueries({
          queryKey: archivedThreadsQueryOptions().queryKey,
        })
        trackEvent('Playground: unarchive thread')
        return true
      } catch (err) {
        log.error('[usePlaygroundThreads] Failed to unarchive thread:', err)
        return false
      }
    },
    [queryClient, refreshThread, setCachedArchivedAt]
  )

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
          event.query.queryKey[1] === 'threadStarted' ||
          event.query.queryKey[1] === THREAD_CHANGED_KEY[1])
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
    hasMoreThreads: recentCursor !== null,
    isLoadingMore,
    loadMoreThreads,
    createThread,
    deleteThread,
    archiveThread,
    unarchiveThread,
    updateThreadTitle,
    renameThread,
    toggleStarThread,
    refreshThread,
  }
}
