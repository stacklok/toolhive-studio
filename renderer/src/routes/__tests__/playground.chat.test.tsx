import type { JSX } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
} from '@tanstack/react-router'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import type { PlaygroundThread } from '@/features/chat/hooks/use-playground-threads'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockThreadsReturn = {
  threads: [] as PlaygroundThread[],
  isLoading: true,
  hasThreads: false,
  createThread: vi.fn(),
  deleteThread: vi.fn(),
  renameThread: vi.fn(),
  toggleStarThread: vi.fn(),
  updateThreadTitle: vi.fn(),
  refreshThread: vi.fn(),
}

vi.mock('@/features/chat/hooks/use-playground-threads', () => ({
  usePlaygroundThreads: () => mockThreadsReturn,
}))

vi.mock('@/features/chat/components/chat-interface', () => ({
  ChatInterface: (props: Record<string, unknown>) => {
    const onRename = props.onRenameThread as ((t: string) => void) | undefined
    const onToggle = props.onToggleStar as (() => void) | undefined
    const onDelete = props.onDeleteThread as (() => void) | undefined
    return (
      <div
        data-testid="chat-interface"
        data-thread-id={props.threadId as string}
        data-thread-title={props.threadTitle as string}
        data-thread-starred={String(props.threadStarred)}
      >
        {onRename && (
          <button
            data-testid="chat-rename-btn"
            onClick={() => onRename('Renamed')}
          />
        )}
        {onToggle && (
          <button data-testid="chat-toggle-star-btn" onClick={onToggle} />
        )}
        {onDelete && (
          <button data-testid="chat-delete-btn" onClick={onDelete} />
        )}
      </div>
    )
  },
}))

vi.mock('@/features/chat/components/playground-sidebar', () => ({
  PlaygroundSidebar: (props: Record<string, unknown>) => {
    const onSelect = props.onSelectThread as (id: string) => void
    const onCreate = props.onCreateThread as () => void
    const onDelete = props.onDeleteThread as (id: string) => void
    return (
      <aside
        data-testid="playground-sidebar"
        data-active-thread-id={props.activeThreadId as string}
      >
        <button
          data-testid="sidebar-select-btn"
          onClick={() => onSelect('other-thread')}
        />
        <button data-testid="sidebar-create-btn" onClick={onCreate} />
        <button
          data-testid="sidebar-delete-btn"
          onClick={() => onDelete('thread-1')}
        />
      </aside>
    )
  },
}))

// ---------------------------------------------------------------------------
// Route import (after mocks are registered)
// ---------------------------------------------------------------------------

import { Route as PlaygroundChatRoute } from '../playground.chat.$threadId'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeThread(
  overrides: Partial<PlaygroundThread> = {}
): PlaygroundThread {
  return {
    id: 'thread-1',
    title: 'My thread',
    starred: false,
    lastEditTimestamp: 2000,
    createdAt: 1000,
    ...overrides,
  }
}

function renderChatRoute(
  threadId = 'thread-1',
  permissions: Record<string, boolean> = {}
) {
  const PlaygroundChatComponent = PlaygroundChatRoute.options
    .component as () => JSX.Element

  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }: { error: Error }) => <div>{error.message}</div>,
  })

  const testRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playground/chat/$threadId',
    component: PlaygroundChatComponent,
  })

  // Catch-all so navigate({ to: '/playground' }) doesn't 404
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playground',
    component: () => <div data-testid="playground-index" />,
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([testRoute, indexRoute]),
    history: createMemoryHistory({
      initialEntries: [`/playground/chat/${threadId}`],
    }),
    defaultNotFoundComponent: () => null,
  })

  const utils = renderRoute(
    router as unknown as ReturnType<typeof createTestRouter>,
    { permissions }
  )

  return { ...utils, router }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Playground chat route (/playground/chat/$threadId)', () => {
  beforeEach(() => {
    mockThreadsReturn.threads = []
    mockThreadsReturn.isLoading = true
    mockThreadsReturn.hasThreads = false
  })

  describe('loading state', () => {
    it('renders a loading spinner while isLoading is true', async () => {
      mockThreadsReturn.isLoading = true
      renderChatRoute()
      await waitFor(() => {
        expect(screen.queryByTestId('chat-interface')).not.toBeInTheDocument()
        expect(
          screen.queryByTestId('playground-sidebar')
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('no threads state', () => {
    it('renders ChatInterface without sidebar when there are no threads', async () => {
      mockThreadsReturn.isLoading = false
      mockThreadsReturn.hasThreads = false
      mockThreadsReturn.threads = []
      renderChatRoute()
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
        expect(
          screen.queryByTestId('playground-sidebar')
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('has threads state', () => {
    beforeEach(() => {
      mockThreadsReturn.isLoading = false
      mockThreadsReturn.hasThreads = true
      mockThreadsReturn.threads = [
        makeThread({ id: 'thread-1', title: 'First', starred: false }),
      ]
    })

    it('renders both PlaygroundSidebar and ChatInterface', async () => {
      renderChatRoute('thread-1')
      await waitFor(() => {
        expect(screen.getByTestId('playground-sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
    })

    it('passes threadId from route param to PlaygroundSidebar as activeThreadId', async () => {
      renderChatRoute('thread-1')
      await waitFor(() => {
        expect(screen.getByTestId('playground-sidebar')).toHaveAttribute(
          'data-active-thread-id',
          'thread-1'
        )
      })
    })

    it('passes threadId and threadTitle to ChatInterface', async () => {
      renderChatRoute('thread-1')
      await waitFor(() => {
        const iface = screen.getByTestId('chat-interface')
        expect(iface).toHaveAttribute('data-thread-id', 'thread-1')
        expect(iface).toHaveAttribute('data-thread-title', 'First')
      })
    })

    it('passes threadStarred from the matching thread to ChatInterface', async () => {
      mockThreadsReturn.threads = [
        makeThread({ id: 'thread-1', starred: true }),
      ]
      renderChatRoute('thread-1')
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toHaveAttribute(
          'data-thread-starred',
          'true'
        )
      })
    })

    it('passes undefined threadStarred when route threadId is not in threads list', async () => {
      renderChatRoute('stale-thread')
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toHaveAttribute(
          'data-thread-starred',
          'undefined'
        )
      })
    })
  })

  describe('navigation handlers', () => {
    beforeEach(() => {
      mockThreadsReturn.isLoading = false
      mockThreadsReturn.hasThreads = true
      mockThreadsReturn.threads = [
        makeThread({ id: 'thread-1', title: 'First' }),
        makeThread({ id: 'other-thread', title: 'Other' }),
      ]
    })

    it('navigates to another thread when sidebar selects it', async () => {
      const { router } = renderChatRoute('thread-1')
      await waitFor(() =>
        expect(screen.getByTestId('playground-sidebar')).toBeInTheDocument()
      )

      fireEvent.click(screen.getByTestId('sidebar-select-btn'))

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(
          '/playground/chat/other-thread'
        )
      )
    })

    it('navigates to the new thread after creation', async () => {
      mockThreadsReturn.createThread.mockResolvedValue('new-thread-id')
      const { router } = renderChatRoute('thread-1')
      await waitFor(() =>
        expect(screen.getByTestId('playground-sidebar')).toBeInTheDocument()
      )

      fireEvent.click(screen.getByTestId('sidebar-create-btn'))

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(
          '/playground/chat/new-thread-id'
        )
      )
    })

    it('does not navigate when createThread returns null', async () => {
      mockThreadsReturn.createThread.mockResolvedValue(null)
      const { router } = renderChatRoute('thread-1')
      await waitFor(() =>
        expect(screen.getByTestId('playground-sidebar')).toBeInTheDocument()
      )

      fireEvent.click(screen.getByTestId('sidebar-create-btn'))

      // Give the async handler time to settle
      await new Promise((r) => setTimeout(r, 50))
      expect(router.state.location.pathname).toBe('/playground/chat/thread-1')
    })

    it('navigates to the next thread after deleting from sidebar', async () => {
      mockThreadsReturn.deleteThread.mockResolvedValue('other-thread')
      const { router } = renderChatRoute('thread-1')
      await waitFor(() =>
        expect(screen.getByTestId('playground-sidebar')).toBeInTheDocument()
      )

      fireEvent.click(screen.getByTestId('sidebar-delete-btn'))

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(
          '/playground/chat/other-thread'
        )
      )
    })

    it('navigates to /playground when deleting the last thread', async () => {
      mockThreadsReturn.deleteThread.mockResolvedValue(null)
      const { router } = renderChatRoute('thread-1')
      await waitFor(() =>
        expect(screen.getByTestId('playground-sidebar')).toBeInTheDocument()
      )

      fireEvent.click(screen.getByTestId('sidebar-delete-btn'))

      await waitFor(() =>
        expect(router.state.location.pathname).toBe('/playground')
      )
    })

    it('calls renameThread with threadId when ChatInterface renames', async () => {
      renderChatRoute('thread-1')
      await waitFor(() =>
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      )

      fireEvent.click(screen.getByTestId('chat-rename-btn'))

      expect(mockThreadsReturn.renameThread).toHaveBeenCalledWith(
        'thread-1',
        'Renamed'
      )
    })

    it('calls toggleStarThread with threadId when ChatInterface toggles star', async () => {
      renderChatRoute('thread-1')
      await waitFor(() =>
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      )

      fireEvent.click(screen.getByTestId('chat-toggle-star-btn'))

      expect(mockThreadsReturn.toggleStarThread).toHaveBeenCalledWith(
        'thread-1'
      )
    })

    it('navigates to /playground when ChatInterface deletes the last thread', async () => {
      mockThreadsReturn.deleteThread.mockResolvedValue(null)
      const { router } = renderChatRoute('thread-1')
      await waitFor(() =>
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      )

      fireEvent.click(screen.getByTestId('chat-delete-btn'))

      await waitFor(() =>
        expect(router.state.location.pathname).toBe('/playground')
      )
    })
  })
})
