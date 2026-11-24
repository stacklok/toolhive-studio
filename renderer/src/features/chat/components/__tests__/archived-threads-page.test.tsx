import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ArchivedThreadsPage } from '../archived-threads-page'

const mockConfirm = vi.fn()
vi.mock('@/common/hooks/use-confirm', () => ({
  useConfirm: () => mockConfirm,
}))

const listThreads = vi.fn()

const makeSummary = (overrides: Record<string, unknown> = {}) => ({
  id: 'a1',
  title: 'Archived chat',
  starred: false,
  createdAt: 1000,
  lastEditTimestamp: 2000,
  archivedAt: Date.now() - 60 * 60 * 1000,
  ...overrides,
})

function renderPage(
  props: Partial<React.ComponentProps<typeof ArchivedThreadsPage>> = {}
) {
  const handlers = {
    onOpenThread: vi.fn(),
    onUnarchiveThread: vi.fn(),
    onDeleteThread: vi.fn(),
    ...props,
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ArchivedThreadsPage {...handlers} />
    </QueryClientProvider>
  )
  return handlers
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConfirm.mockResolvedValue(true)
  window.electronAPI = {
    ...window.electronAPI,
    chat: { listThreads } as unknown as typeof window.electronAPI.chat,
  }
  listThreads.mockResolvedValue({ threads: [], nextCursor: null })
})

describe('ArchivedThreadsPage', () => {
  it('requests archived threads only', async () => {
    renderPage()
    await screen.findByText(/no archived chats/i)
    expect(listThreads).toHaveBeenCalledWith({
      archived: true,
      limit: 50,
      cursor: null,
    })
  })

  it('lists archived threads with a starred marker', async () => {
    listThreads.mockResolvedValue({
      threads: [makeSummary({ starred: true })],
      nextCursor: null,
    })
    renderPage()
    expect(await screen.findByText('Archived chat')).toBeInTheDocument()
    expect(screen.getByLabelText('Starred')).toBeInTheDocument()
    expect(screen.getByText(/archived 1h ago/i)).toBeInTheDocument()
  })

  it('opens, unarchives and deletes a thread', async () => {
    listThreads.mockResolvedValue({
      threads: [makeSummary()],
      nextCursor: null,
    })
    const handlers = renderPage()
    await userEvent.click(await screen.findByText('Archived chat'))
    expect(handlers.onOpenThread).toHaveBeenCalledWith('a1')

    await userEvent.click(
      screen.getByRole('button', { name: /unarchive archived chat/i })
    )
    expect(handlers.onUnarchiveThread).toHaveBeenCalledWith('a1')

    await userEvent.click(
      screen.getByRole('button', { name: /delete archived chat/i })
    )
    expect(mockConfirm).toHaveBeenCalled()
    expect(handlers.onDeleteThread).toHaveBeenCalledWith('a1')
  })

  it('does not delete when the confirm is cancelled', async () => {
    mockConfirm.mockResolvedValue(false)
    listThreads.mockResolvedValue({
      threads: [makeSummary()],
      nextCursor: null,
    })
    const handlers = renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: /delete archived chat/i })
    )
    expect(handlers.onDeleteThread).not.toHaveBeenCalled()
  })

  it('loads the next page with the cursor', async () => {
    listThreads
      .mockResolvedValueOnce({
        threads: [makeSummary({ id: 'a1', title: 'First' })],
        nextCursor: { ts: 10, id: 'a1' },
      })
      .mockResolvedValueOnce({
        threads: [makeSummary({ id: 'a2', title: 'Second' })],
        nextCursor: null,
      })
    renderPage()
    await userEvent.click(
      await screen.findByRole('button', { name: /show more/i })
    )
    expect(await screen.findByText('Second')).toBeInTheDocument()
    expect(listThreads).toHaveBeenLastCalledWith({
      archived: true,
      limit: 50,
      cursor: { ts: 10, id: 'a1' },
    })
    expect(
      screen.queryByRole('button', { name: /show more/i })
    ).not.toBeInTheDocument()
  })

  it('shows an error with a retry instead of an empty list when loading fails', async () => {
    listThreads.mockRejectedValueOnce(new Error('db locked'))
    renderPage()

    expect(
      await screen.findByText("Couldn't load archived chats")
    ).toBeInTheDocument()
    expect(screen.queryByText('No archived chats')).not.toBeInTheDocument()

    listThreads.mockResolvedValue({
      threads: [makeSummary()],
      nextCursor: null,
    })
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Archived chat')).toBeInTheDocument()
  })
})
