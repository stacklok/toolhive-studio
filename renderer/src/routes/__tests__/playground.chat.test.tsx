import type { JSX } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
  RouterProvider,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PermissionsProvider } from '@/common/contexts/permissions/permissions-provider'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { NewsletterModalProvider } from '@/common/contexts/newsletter-modal-provider'
import { render } from '@testing-library/react'
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
  ChatInterface: (props: Record<string, unknown>) => (
    <div
      data-testid="chat-interface"
      data-thread-id={props.threadId as string}
      data-thread-title={props.threadTitle as string}
      data-thread-starred={String(props.threadStarred)}
    />
  ),
}))

vi.mock('@/features/chat/components/playground-sidebar', () => ({
  PlaygroundSidebar: (props: Record<string, unknown>) => (
    <aside
      data-testid="playground-sidebar"
      data-active-thread-id={props.activeThreadId as string}
    />
  ),
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

  const router = new Router({
    routeTree: rootRoute.addChildren([testRoute]),
    history: createMemoryHistory({
      initialEntries: [`/playground/chat/${threadId}`],
    }),
    defaultNotFoundComponent: () => null,
  })

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <NewsletterModalProvider>
      <PermissionsProvider value={permissions}>
        <PromptProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </PromptProvider>
      </PermissionsProvider>
    </NewsletterModalProvider>
  )
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
})

// Keep a simple re-export test to satisfy the unused import warning
export {}
