import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { usePlaygroundThreads } from '../use-playground-threads'

vi.mock('electron-log/renderer', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ---------------------------------------------------------------------------
// electronAPI.chat stub
// ---------------------------------------------------------------------------

const mockChatAPI = {
  getAllThreads: vi.fn(),
  setActiveThreadId: vi.fn(),
  createChatThread: vi.fn(),
  deleteThread: vi.fn(),
  getThread: vi.fn(),
  updateThread: vi.fn(),
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const makeDbThread = (overrides: Record<string, unknown> = {}) => ({
  id: 'thread-1',
  title: 'Test thread',
  starred: false,
  lastEditTimestamp: 2000,
  createdAt: 1000,
  messages: [],
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  window.electronAPI = {
    ...window.electronAPI,
    chat: mockChatAPI as unknown as typeof window.electronAPI.chat,
  }
  mockChatAPI.getAllThreads.mockResolvedValue([])
  mockChatAPI.setActiveThreadId.mockResolvedValue(undefined)
  mockChatAPI.createChatThread.mockResolvedValue({
    success: true,
    threadId: 'new-thread',
  })
  mockChatAPI.deleteThread.mockResolvedValue({ success: true })
  mockChatAPI.getThread.mockResolvedValue(makeDbThread())
  mockChatAPI.updateThread.mockResolvedValue({ success: true })
})

describe('usePlaygroundThreads', () => {
  describe('initial load', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(
        () => usePlaygroundThreads('initial-thread'),
        { wrapper: createWrapper() }
      )
      expect(result.current.isLoading).toBe(true)
    })

    it('loads threads from electronAPI and sorts by lastEditTimestamp desc', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'old', lastEditTimestamp: 1000 }),
        makeDbThread({ id: 'new', lastEditTimestamp: 3000 }),
      ])
      const { result } = renderHook(() => usePlaygroundThreads('new'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.threads[0]!.id).toBe('new')
      expect(result.current.threads[1]!.id).toBe('old')
    })

    it('calls setActiveThreadId with the provided activeThreadId via IPC', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'thread-from-url' }),
      ])
      renderHook(() => usePlaygroundThreads('thread-from-url'), {
        wrapper: createWrapper(),
      })
      await waitFor(() =>
        expect(mockChatAPI.setActiveThreadId).toHaveBeenCalledWith(
          'thread-from-url'
        )
      )
    })

    it('updates setActiveThreadId when activeThreadId changes', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'thread-a' }),
        makeDbThread({ id: 'thread-b' }),
      ])
      let activeId = 'thread-a'
      const { rerender } = renderHook(() => usePlaygroundThreads(activeId), {
        wrapper: createWrapper(),
      })
      await waitFor(() =>
        expect(mockChatAPI.setActiveThreadId).toHaveBeenCalledWith('thread-a')
      )

      activeId = 'thread-b'
      rerender()

      await waitFor(() =>
        expect(mockChatAPI.setActiveThreadId).toHaveBeenCalledWith('thread-b')
      )
    })

    it('clears the active thread id when activeThreadId becomes null', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'thread-a' }),
      ])
      let activeId: string | null = 'thread-a'
      const { rerender } = renderHook(() => usePlaygroundThreads(activeId), {
        wrapper: createWrapper(),
      })
      await waitFor(() =>
        expect(mockChatAPI.setActiveThreadId).toHaveBeenCalledWith('thread-a')
      )

      activeId = null
      rerender()

      await waitFor(() =>
        expect(mockChatAPI.setActiveThreadId).toHaveBeenLastCalledWith(
          undefined
        )
      )
    })

    it('does not call setActiveThreadId for a pending draft id', async () => {
      // Drafts have no DB row; the IPC would reject with `Thread not found`.
      mockChatAPI.getAllThreads.mockResolvedValue([])
      const { result } = renderHook(
        () => usePlaygroundThreads('thread_url_draft'),
        { wrapper: createWrapper() }
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.threads[0]).toMatchObject({
        id: 'thread_url_draft',
        pending: true,
      })
      expect(mockChatAPI.setActiveThreadId).not.toHaveBeenCalledWith(
        'thread_url_draft'
      )
    })

    it('maps starred field from DB thread', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'starred-thread', starred: true }),
      ])
      const { result } = renderHook(
        () => usePlaygroundThreads('starred-thread'),
        { wrapper: createWrapper() }
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.threads[0]!.starred).toBe(true)
    })

    it('seeds the URL-driven activeThreadId as a pending draft when not in the DB', async () => {
      // Fresh-visit / deep-link case: keeps `hasThreads` true so the
      // sidebar renders and ChatInterface skips the legacy auto-create.
      mockChatAPI.getAllThreads.mockResolvedValue([])
      const { result } = renderHook(
        () => usePlaygroundThreads('thread_url_draft'),
        { wrapper: createWrapper() }
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      await waitFor(() => expect(result.current.threads).toHaveLength(1))
      expect(result.current.threads[0]).toMatchObject({
        id: 'thread_url_draft',
        pending: true,
      })
      expect(result.current.hasThreads).toBe(true)
    })

    it('does not seed when the URL activeThreadId is already in the loaded DB threads', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'thread-1' }),
      ])
      const { result } = renderHook(() => usePlaygroundThreads('thread-1'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.threads).toHaveLength(1)
      expect(result.current.threads[0]?.pending).toBeUndefined()
    })

    it('does not seed when activeThreadId is null', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([])
      const { result } = renderHook(() => usePlaygroundThreads(null), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.threads).toHaveLength(0)
      expect(result.current.hasThreads).toBe(false)
    })
  })

  describe('createThread', () => {
    it('generates a draft id locally, prepends a pending entry, and skips IPC', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'existing' }),
      ])
      const { result } = renderHook(() => usePlaygroundThreads('existing'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      let returnedId: string | null = null
      await act(async () => {
        returnedId = await result.current.createThread()
      })

      expect(mockChatAPI.createChatThread).not.toHaveBeenCalled()
      expect(returnedId).toMatch(/^thread_/)
      expect(result.current.threads[0]!.id).toBe(returnedId)
      expect(result.current.threads[0]!.pending).toBe(true)
    })

    it('reuses an existing empty draft instead of generating another one', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([])
      const { result } = renderHook(() => usePlaygroundThreads(null), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      let firstId: string | null = null
      await act(async () => {
        firstId = await result.current.createThread()
      })

      let secondId: string | null = null
      await act(async () => {
        secondId = await result.current.createThread()
      })

      expect(firstId).not.toBeNull()
      expect(secondId).toBe(firstId)
      expect(result.current.threads).toHaveLength(1)
    })
  })

  describe('deleteThread', () => {
    it('removes the thread from the list', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'thread-1' }),
      ])
      const { result } = renderHook(() => usePlaygroundThreads('thread-1'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.deleteThread('thread-1')
      })

      expect(result.current.threads).toHaveLength(0)
    })

    it('returns the next thread ID when the deleted thread has a successor', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'active', lastEditTimestamp: 2000 }),
        makeDbThread({ id: 'next', lastEditTimestamp: 1000 }),
      ])
      const { result } = renderHook(() => usePlaygroundThreads('active'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      let res: Awaited<ReturnType<typeof result.current.deleteThread>> = {
        success: false,
      }
      await act(async () => {
        res = await result.current.deleteThread('active')
      })

      expect(res).toEqual({ success: true, nextId: 'next' })
    })

    it('returns a success result with null nextId when the last thread is deleted', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'only' }),
      ])
      const { result } = renderHook(() => usePlaygroundThreads('only'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      let res: Awaited<ReturnType<typeof result.current.deleteThread>> = {
        success: false,
      }
      await act(async () => {
        res = await result.current.deleteThread('only')
      })

      expect(res).toEqual({ success: true, nextId: null })
      expect(result.current.hasThreads).toBe(false)
    })

    it('returns a failure result and does not change state when deleteThread returns failure', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'thread-1' }),
      ])
      mockChatAPI.deleteThread.mockResolvedValue({
        success: false,
        error: 'not found',
      })
      const { result } = renderHook(() => usePlaygroundThreads('thread-1'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      let res: Awaited<ReturnType<typeof result.current.deleteThread>> = {
        success: true,
        nextId: null,
      }
      await act(async () => {
        res = await result.current.deleteThread('thread-1')
      })

      expect(result.current.threads).toHaveLength(1)
      expect(res).toEqual({ success: false })
    })

    it('removes a pending draft locally without calling deleteThread IPC', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([])
      const { result } = renderHook(() => usePlaygroundThreads(null), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      let draftId: string | null = null
      await act(async () => {
        draftId = await result.current.createThread()
      })

      expect(draftId).not.toBeNull()

      let res: Awaited<ReturnType<typeof result.current.deleteThread>> = {
        success: false,
      }
      await act(async () => {
        res = await result.current.deleteThread(draftId!)
      })

      expect(mockChatAPI.deleteThread).not.toHaveBeenCalled()
      expect(res).toEqual({ success: true, nextId: null })
      expect(result.current.threads).toHaveLength(0)
    })
  })

  describe('updateThreadTitle', () => {
    it('updates title locally without calling IPC', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 't1', title: 'Old' }),
      ])
      const { result } = renderHook(() => usePlaygroundThreads('t1'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.updateThreadTitle('t1', 'New title')
      })

      expect(result.current.threads.find((t) => t.id === 't1')!.title).toBe(
        'New title'
      )
      expect(mockChatAPI.updateThread).not.toHaveBeenCalled()
    })
  })

  describe('renameThread', () => {
    it('calls updateThread IPC with titleEditedByUser: true and refreshes', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 't1', title: 'Old' }),
      ])
      mockChatAPI.getThread.mockResolvedValue(
        makeDbThread({ id: 't1', title: 'Renamed' })
      )
      const { result } = renderHook(() => usePlaygroundThreads('t1'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.renameThread('t1', 'Renamed')
      })

      expect(mockChatAPI.updateThread).toHaveBeenCalledWith('t1', {
        title: 'Renamed',
        titleEditedByUser: true,
      })
      expect(mockChatAPI.getThread).toHaveBeenCalledWith('t1')
      expect(result.current.threads.find((t) => t.id === 't1')!.title).toBe(
        'Renamed'
      )
    })
  })

  describe('toggleStarThread', () => {
    it('flips starred flag optimistically and calls updateThread IPC', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 't1', starred: false }),
      ])
      const { result } = renderHook(() => usePlaygroundThreads('t1'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.toggleStarThread('t1')
      })

      expect(result.current.threads.find((t) => t.id === 't1')!.starred).toBe(
        true
      )
      expect(mockChatAPI.updateThread).toHaveBeenCalledWith('t1', {
        starred: true,
      })
    })

    it('flips back to false when already starred', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 't1', starred: true }),
      ])
      const { result } = renderHook(() => usePlaygroundThreads('t1'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.toggleStarThread('t1')
      })

      expect(result.current.threads.find((t) => t.id === 't1')!.starred).toBe(
        false
      )
      expect(mockChatAPI.updateThread).toHaveBeenCalledWith('t1', {
        starred: false,
      })
    })

    it('is a no-op for an unknown thread id', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([makeDbThread({ id: 't1' })])
      const { result } = renderHook(() => usePlaygroundThreads('t1'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.toggleStarThread('does-not-exist')
      })

      expect(mockChatAPI.updateThread).not.toHaveBeenCalled()
    })
  })

  describe('refreshThread', () => {
    it('merges updated thread data into the list', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 't1', title: 'Before' }),
      ])
      mockChatAPI.getThread.mockResolvedValue(
        makeDbThread({ id: 't1', title: 'After' })
      )
      const { result } = renderHook(() => usePlaygroundThreads('t1'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.refreshThread('t1')
      })

      expect(result.current.threads.find((t) => t.id === 't1')!.title).toBe(
        'After'
      )
    })

    it('prepends a new thread to the list when it is not found', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([])
      mockChatAPI.getThread.mockResolvedValue(
        makeDbThread({ id: 'brand-new', title: 'New' })
      )
      const { result } = renderHook(() => usePlaygroundThreads('brand-new'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.refreshThread('brand-new')
      })

      expect(result.current.threads).toHaveLength(1)
      expect(result.current.threads[0]!.id).toBe('brand-new')
    })

    it('does nothing when getThread returns null', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([makeDbThread({ id: 't1' })])
      mockChatAPI.getThread.mockResolvedValue(null)
      const { result } = renderHook(() => usePlaygroundThreads('t1'), {
        wrapper: createWrapper(),
      })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const threadsBefore = [...result.current.threads]
      await act(async () => {
        await result.current.refreshThread('t1')
      })

      expect(result.current.threads).toEqual(threadsBefore)
    })
  })

  describe('query cache subscription', () => {
    it('calls refreshThread when streamingComplete query is updated', async () => {
      mockChatAPI.getAllThreads.mockResolvedValue([
        makeDbThread({ id: 'streaming-thread' }),
      ])
      mockChatAPI.getThread.mockResolvedValue(
        makeDbThread({ id: 'streaming-thread', title: 'Auto title' })
      )

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          children
        )

      const { result } = renderHook(
        () => usePlaygroundThreads('streaming-thread'),
        { wrapper }
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Simulate the streamingComplete signal
      act(() => {
        queryClient.setQueryData(['chat', 'streamingComplete'], {
          threadId: 'streaming-thread',
          timestamp: Date.now(),
        })
      })

      await waitFor(() =>
        expect(
          result.current.threads.find((t) => t.id === 'streaming-thread')?.title
        ).toBe('Auto title')
      )
    })
  })
})
