import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
} from '@tanstack/react-router'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'

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
  listThreads: vi.fn(),
  getThreadSummary: vi.fn(),
  getActiveThreadId: vi.fn(),
  createChatThread: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  window.electronAPI = {
    ...window.electronAPI,
    chat: mockChatAPI as unknown as typeof window.electronAPI.chat,
  }
  setDbThreads([])
  mockChatAPI.getActiveThreadId.mockResolvedValue(undefined)
  // Kept for assertions that the IPC is NOT called now that drafts are
  // generated locally — no test expects a successful response.
  mockChatAPI.createChatThread.mockResolvedValue({
    success: false,
    error: 'should not be called',
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
  archivedAt: null as number | null,
  ...overrides,
})

/** In-memory stand-in for the main-process thread table. */
function setDbThreads(list: ReturnType<typeof makeDbThread>[]) {
  mockChatAPI.listThreads.mockImplementation(
    async (opts: { limit?: number } = {}) => {
      const rows = list
        .filter((t) => !t.archivedAt)
        .sort((a, b) => b.lastEditTimestamp - a.lastEditTimestamp)
      return {
        threads: opts.limit ? rows.slice(0, opts.limit) : rows,
        nextCursor: null,
      }
    }
  )
  mockChatAPI.getThreadSummary.mockImplementation(
    async (id: string) => list.find((t) => t.id === id) ?? null
  )
}

function renderIndexRoute() {
  const IndexComponent = PlaygroundIndexRoute.options.component as () => null
  // Redirect resolution now lives in `beforeLoad`; wire it into the test
  // router so the redirect fires during navigation, not on mount. The real
  // `beforeLoad` is typed against the generated route tree and cannot be
  // statically assigned to this ad-hoc test route — the `as` cast is only
  // about shape, the underlying function is unchanged.
  const beforeLoad = PlaygroundIndexRoute.options.beforeLoad as unknown as (
    ...args: unknown[]
  ) => Promise<void> | void

  const rootRoute = createRootRoute({
    component: Outlet,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playground/',
    component: IndexComponent,
    beforeLoad,
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

  const utils = renderRoute(
    router as unknown as ReturnType<typeof createTestRouter>
  )

  return { ...utils, router }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Playground index route (/playground/)', () => {
  it('redirects to the stored active thread when it exists', async () => {
    mockChatAPI.getActiveThreadId.mockResolvedValue('active-thread')
    setDbThreads([
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
    setDbThreads([
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
    setDbThreads([makeDbThread({ id: 'newest', lastEditTimestamp: 5000 })])

    const { router } = renderIndexRoute()

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/playground/chat/newest')
    )
  })

  it('redirects to a locally-generated draft thread when no DB threads exist', async () => {
    mockChatAPI.getActiveThreadId.mockResolvedValue(undefined)
    setDbThreads([])

    const { router } = renderIndexRoute()

    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(
        /^\/playground\/chat\/thread_/
      )
    )
    // Drafts are generated in the renderer — no IPC round-trip and no
    // empty row written to SQLite until the user sends a message.
    expect(mockChatAPI.createChatThread).not.toHaveBeenCalled()
  })

  it('skips a stored active thread that has been archived', async () => {
    mockChatAPI.getActiveThreadId.mockResolvedValue('archived')
    setDbThreads([
      makeDbThread({ id: 'archived', lastEditTimestamp: 9000, archivedAt: 1 }),
      makeDbThread({ id: 'live', lastEditTimestamp: 1000 }),
    ])

    const { router } = renderIndexRoute()

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/playground/chat/live')
    )
  })
})
