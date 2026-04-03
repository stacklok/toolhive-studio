import type { JSX } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'
import type { PlaygroundThread } from '@/features/chat/hooks/use-playground-threads'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// usePlaygroundThreads — controlled per test via mockThreadsReturn
const mockThreadsReturn = {
  threads: [] as PlaygroundThread[],
  activeThreadId: null as string | null,
  isLoading: true,
  hasThreads: false,
  createThread: vi.fn(),
  selectThread: vi.fn(),
  deleteThread: vi.fn(),
  renameThread: vi.fn(),
  toggleStarThread: vi.fn(),
  updateThreadTitle: vi.fn(),
  refreshThread: vi.fn(),
}

vi.mock('@/features/chat/hooks/use-playground-threads', () => ({
  usePlaygroundThreads: () => mockThreadsReturn,
}))

// Lightweight mocks for heavy sub-components
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

vi.mock('@/common/components/not-found', () => ({
  NotFound: () => <div data-testid="not-found" />,
}))

// ---------------------------------------------------------------------------
// Route import (after mocks are registered)
// ---------------------------------------------------------------------------

// Dynamic import to ensure mocks are applied before module evaluation.
// We use the top-level import but rely on vi.mock hoisting.
import { Route as PlaygroundRoute } from '../playground'

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

function renderPlayground(permissions: Record<string, boolean> = {}) {
  const PlaygroundComponent = PlaygroundRoute.options
    .component as () => JSX.Element
  const router = createTestRouter(() => <PlaygroundComponent />, '/playground')
  return renderRoute(router, { permissions })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Playground route', () => {
  beforeEach(() => {
    // Reset to loading state
    mockThreadsReturn.threads = []
    mockThreadsReturn.activeThreadId = null
    mockThreadsReturn.isLoading = true
    mockThreadsReturn.hasThreads = false
  })

  describe('permission gate', () => {
    it('renders NotFound when playground permission is denied', async () => {
      mockThreadsReturn.isLoading = false
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: false })
      await waitFor(() =>
        expect(screen.getByTestId('not-found')).toBeInTheDocument()
      )
    })

    it('renders content when permission is granted', async () => {
      mockThreadsReturn.isLoading = false
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: true })
      await waitFor(() =>
        expect(screen.queryByTestId('not-found')).not.toBeInTheDocument()
      )
    })
  })

  describe('loading state', () => {
    it('renders a loading spinner while isLoading is true', async () => {
      mockThreadsReturn.isLoading = true
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: true })
      // The spinner is animated dots with no text — just ensure no chat UI is shown yet
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
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: true })
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
        expect(
          screen.queryByTestId('playground-sidebar')
        ).not.toBeInTheDocument()
      })
    })

    it('renders ChatInterface with no thread props in no-threads state', async () => {
      mockThreadsReturn.isLoading = false
      mockThreadsReturn.hasThreads = false
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: true })
      await waitFor(() => {
        const iface = screen.getByTestId('chat-interface')
        expect(iface).not.toHaveAttribute('data-thread-id')
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
      mockThreadsReturn.activeThreadId = 'thread-1'
    })

    it('renders both PlaygroundSidebar and ChatInterface', async () => {
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: true })
      await waitFor(() => {
        expect(screen.getByTestId('playground-sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
      })
    })

    it('passes activeThreadId to PlaygroundSidebar', async () => {
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: true })
      await waitFor(() => {
        expect(screen.getByTestId('playground-sidebar')).toHaveAttribute(
          'data-active-thread-id',
          'thread-1'
        )
      })
    })

    it('passes threadId and threadTitle to ChatInterface', async () => {
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: true })
      await waitFor(() => {
        const iface = screen.getByTestId('chat-interface')
        expect(iface).toHaveAttribute('data-thread-id', 'thread-1')
        expect(iface).toHaveAttribute('data-thread-title', 'First')
      })
    })

    it('passes threadStarred from the active thread to ChatInterface', async () => {
      mockThreadsReturn.threads = [
        makeThread({ id: 'thread-1', starred: true }),
      ]
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: true })
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toHaveAttribute(
          'data-thread-starred',
          'true'
        )
      })
    })

    it('passes undefined threadStarred when activeThread is not in threads list', async () => {
      // activeThreadId points to a thread that is no longer in the list (stale)
      mockThreadsReturn.activeThreadId = 'stale-thread'
      renderPlayground({ [PERMISSION_KEYS.PLAYGROUND_MENU]: true })
      await waitFor(() => {
        expect(screen.getByTestId('chat-interface')).toHaveAttribute(
          'data-thread-starred',
          'undefined'
        )
      })
    })
  })
})
