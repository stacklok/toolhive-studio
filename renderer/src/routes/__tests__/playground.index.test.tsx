import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
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

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('electron-log/renderer', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ---------------------------------------------------------------------------
// electronAPI.chat stub
// ---------------------------------------------------------------------------

const mockChatAPI = {
  getAllThreads: vi.fn(),
  getActiveThreadId: vi.fn(),
  createChatThread: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  window.electronAPI = {
    ...window.electronAPI,
    chat: mockChatAPI as unknown as typeof window.electronAPI.chat,
  }
  mockChatAPI.getAllThreads.mockResolvedValue([])
  mockChatAPI.getActiveThreadId.mockResolvedValue(undefined)
  mockChatAPI.createChatThread.mockResolvedValue({
    success: true,
    threadId: 'created-thread',
  })
})

// ---------------------------------------------------------------------------
// Route import (after mocks)
// ---------------------------------------------------------------------------

import { Route as PlaygroundIndexRoute } from '../playground.index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeDbThread = (overrides: Record<string, unknown> = {}) => ({
  id: 'thread-1',
  title: 'Test thread',
  starred: false,
  lastEditTimestamp: 2000,
  createdAt: 1000,
  messages: [],
  ...overrides,
})

function renderIndexRoute() {
  const IndexComponent = PlaygroundIndexRoute.options.component as () => null

  const rootRoute = createRootRoute({
    component: Outlet,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playground/',
    component: IndexComponent,
  })

  // Catch-all for the redirect target — renders the threadId for assertion
  const chatRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playground/chat/$threadId',
    component: () => {
      const { threadId } = chatRoute.useParams()
      return <div data-testid="chat-route" data-thread-id={threadId} />
    },
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([indexRoute, chatRoute]),
    history: createMemoryHistory({ initialEntries: ['/playground/'] }),
    defaultNotFoundComponent: () => null,
  })

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const utils = render(
    <NewsletterModalProvider>
      <PermissionsProvider>
        <PromptProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </PromptProvider>
      </PermissionsProvider>
    </NewsletterModalProvider>
  )

  return { ...utils, router }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Playground index route (/playground/)', () => {
  it('redirects to the stored active thread when it exists', async () => {
    mockChatAPI.getActiveThreadId.mockResolvedValue('active-thread')
    mockChatAPI.getAllThreads.mockResolvedValue([
      makeDbThread({ id: 'active-thread', lastEditTimestamp: 1000 }),
      makeDbThread({ id: 'other-thread', lastEditTimestamp: 2000 }),
    ])

    const { router } = renderIndexRoute()

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        '/playground/chat/active-thread'
      )
    )
  })

  it('falls back to most recent thread when stored active ID is stale', async () => {
    mockChatAPI.getActiveThreadId.mockResolvedValue('deleted-thread')
    mockChatAPI.getAllThreads.mockResolvedValue([
      makeDbThread({ id: 'recent', lastEditTimestamp: 3000 }),
      makeDbThread({ id: 'old', lastEditTimestamp: 1000 }),
    ])

    const { router } = renderIndexRoute()

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/playground/chat/recent')
    )
  })

  it('falls back to most recent thread when no stored active ID exists', async () => {
    mockChatAPI.getActiveThreadId.mockResolvedValue(undefined)
    mockChatAPI.getAllThreads.mockResolvedValue([
      makeDbThread({ id: 'newest', lastEditTimestamp: 5000 }),
    ])

    const { router } = renderIndexRoute()

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/playground/chat/newest')
    )
  })

  it('creates a new thread and redirects when no threads exist', async () => {
    mockChatAPI.getActiveThreadId.mockResolvedValue(undefined)
    mockChatAPI.getAllThreads.mockResolvedValue([])
    mockChatAPI.createChatThread.mockResolvedValue({
      success: true,
      threadId: 'brand-new',
    })

    const { router } = renderIndexRoute()

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/playground/chat/brand-new')
    )
    expect(mockChatAPI.createChatThread).toHaveBeenCalledOnce()
  })

  it('does not redirect when createChatThread fails', async () => {
    mockChatAPI.getActiveThreadId.mockResolvedValue(undefined)
    mockChatAPI.getAllThreads.mockResolvedValue([])
    mockChatAPI.createChatThread.mockResolvedValue({
      success: false,
      error: 'db error',
    })

    const { router } = renderIndexRoute()

    // Give the effect time to run — route should stay on /playground/
    await new Promise((r) => setTimeout(r, 100))
    expect(router.state.location.pathname).toBe('/playground/')
  })
})
