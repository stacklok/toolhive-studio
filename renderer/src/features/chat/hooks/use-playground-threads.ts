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
  /**
   * True for threads that exist only in renderer state and have not yet
   * been persisted to the DB. A draft is promoted to a real DB row by
   * `ensureThreadExists` in `use-chat-streaming` when the user sends the
   * first message — at which point `refreshThread` replaces the entry
   * with the lightweight projection from the DB (no `pending` field).
   */
  pending?: boolean
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

  // Persist the URL-driven active thread to IPC whenever it changes.
  // When the URL has no thread (e.g. user navigated to /playground/agents),
  // explicitly clear the main-process pointer so it doesn't keep a stale id.
  // For pending drafts the IPC validates the row exists and returns failure
  // silently — that's fine, drafts intentionally don't survive reloads.
  useEffect(() => {
    window.electronAPI.chat.setActiveThreadId(activeThreadId ?? undefined)
  }, [activeThreadId])

  // Seed the URL-driven thread id as a pending draft when the initial DB
  // load doesn't include it (typical first-visit / deep-link case where
  // `playground.index.tsx` redirected to a renderer-generated id). Without
  // this, `hasThreads` stays false on a fresh visit, the sidebar disappears,
  // and `ChatInterface` falls into the legacy `useThreadManagement`
  // auto-create path — which calls `createChatThread()` over IPC and writes
  // the empty row this PR is trying to avoid.
  useEffect(() => {
    if (isLoading) return
    if (!activeThreadId) return
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
  }, [activeThreadId, isLoading])

  /**
   * Returns the id of an existing in-memory draft thread (created locally,
   * not yet persisted) so the caller can navigate to it instead of piling
   * up empty drafts. Returns `null` if no reusable draft is available.
   */
  const findReusableDraftId = useCallback((): string | null => {
    const draft = threadsRef.current.find((t) => t.pending)
    return draft?.id ?? null
  }, [])

  /**
   * Returns the id of an existing or newly-generated draft thread.
   *
   * No IPC call: the thread row is only written to SQLite when the user
   * sends the first message (see `ensureThreadExists` in
   * `use-chat-streaming.ts`). Until then the entry lives in renderer
   * state with `pending: true` so the sidebar can render it.
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
        // Pending drafts only exist in renderer state — skip the IPC call
        // (which would fail with "Thread not found") and remove locally.
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
