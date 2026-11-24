import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SearchChatsDialog } from '../search-chats-dialog'
import { ChatSearchProvider } from '../chat-search-provider'
import { useChatSearch } from '../../hooks/use-chat-search'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

const mockTrackEvent = vi.fn()
vi.mock('@/common/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

const listThreads = vi.fn()
const searchThreads = vi.fn()

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 't1',
  title: 'Recent chat',
  starred: false,
  createdAt: 1000,
  lastEditTimestamp: Date.now(),
  archivedAt: null,
  ...overrides,
})

function OpenButton() {
  const { openSearch } = useChatSearch()
  return <button onClick={() => openSearch('button')}>open</button>
}

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ChatSearchProvider>
        <OpenButton />
        <SearchChatsDialog />
      </ChatSearchProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  window.electronAPI = {
    ...window.electronAPI,
    chat: {
      listThreads,
      searchThreads,
    } as unknown as typeof window.electronAPI.chat,
  }
  listThreads.mockResolvedValue({ threads: [row()], nextCursor: null })
  searchThreads.mockResolvedValue([])
})

describe('SearchChatsDialog', () => {
  it('opens with Cmd+K / Ctrl+K and lists recent chats', async () => {
    renderDialog()
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(await screen.findByText('Recent chat')).toBeInTheDocument()
    expect(listThreads).toHaveBeenCalledWith({ limit: 10 })
    expect(mockTrackEvent).toHaveBeenCalledWith('Playground: open search', {
      'search.source': 'shortcut',
    })
  })

  it('searches after typing and highlights snippet hits', async () => {
    searchThreads.mockResolvedValue([
      row({
        id: 'hit',
        title: 'Auth debugging',
        archivedAt: 123,
        snippet: 'we fixed the \u0002callback\u0003 url',
      }),
    ])
    renderDialog()
    await userEvent.click(screen.getByText('open'))
    await userEvent.type(
      await screen.findByPlaceholderText('Search chats…'),
      'callb'
    )

    const title = await screen.findByText('Auth debugging')
    expect(searchThreads).toHaveBeenLastCalledWith('callb')
    const item = title.closest('[cmdk-item]') as HTMLElement
    expect(within(item).getByText('Archived')).toBeInTheDocument()
    expect(within(item).getByText('callback').tagName).toBe('MARK')
  })

  it('shows an empty state when nothing matches', async () => {
    renderDialog()
    await userEvent.click(screen.getByText('open'))
    await userEvent.type(
      await screen.findByPlaceholderText('Search chats…'),
      'zzz'
    )
    expect(await screen.findByText('No chats found.')).toBeInTheDocument()
  })

  it('navigates to the chosen chat and never sends the query text', async () => {
    searchThreads.mockResolvedValue([row({ id: 'target', title: 'Target' })])
    renderDialog()
    await userEvent.click(screen.getByText('open'))
    await userEvent.type(
      await screen.findByPlaceholderText('Search chats…'),
      'secret words'
    )
    await userEvent.click(await screen.findByText('Target'))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/playground/chat/$threadId',
      params: { threadId: 'target' },
    })
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText('Search chats…')
      ).not.toBeInTheDocument()
    )
    expect(JSON.stringify(mockTrackEvent.mock.calls)).not.toContain('secret')
  })

  it('opens the top result with Enter right after typing', async () => {
    searchThreads.mockResolvedValue([
      row({ id: 'first', title: 'First hit' }),
      row({ id: 'second', title: 'Second hit' }),
    ])
    renderDialog()
    await userEvent.click(screen.getByText('open'))
    await userEvent.type(
      await screen.findByPlaceholderText('Search chats…'),
      'hit'
    )
    await screen.findByText('First hit')
    await userEvent.keyboard('{Enter}')

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/playground/chat/$threadId',
      params: { threadId: 'first' },
    })
  })

  it('opens the new top result when the same chats come back reordered', async () => {
    searchThreads.mockImplementation(async (q: string) =>
      q === 'ab'
        ? [row({ id: 'b', title: 'Chat B' }), row({ id: 'a', title: 'Chat A' })]
        : [row({ id: 'a', title: 'Chat A' }), row({ id: 'b', title: 'Chat B' })]
    )
    renderDialog()
    await userEvent.click(screen.getByText('open'))
    const input = await screen.findByPlaceholderText('Search chats…')
    await userEvent.type(input, 'a')
    await screen.findByText('Chat A')
    await waitFor(() => expect(searchThreads).toHaveBeenLastCalledWith('a'))
    // Move the selection, so the user has picked something in this list.
    await userEvent.keyboard('{ArrowDown}')

    await userEvent.type(input, 'b')
    await waitFor(() => expect(searchThreads).toHaveBeenLastCalledWith('ab'))
    await waitFor(() =>
      expect(screen.getByText('Chat B').closest('[cmdk-item]')).toHaveAttribute(
        'aria-selected',
        'true'
      )
    )
    await userEvent.keyboard('{Enter}')

    expect(mockNavigate).toHaveBeenLastCalledWith({
      to: '/playground/chat/$threadId',
      params: { threadId: 'b' },
    })
  })

  it('reopens on recent chats after closing mid-debounce', async () => {
    searchThreads.mockResolvedValue([row({ id: 'hit', title: 'Search hit' })])
    renderDialog()
    await userEvent.click(screen.getByText('open'))
    await userEvent.type(
      await screen.findByPlaceholderText('Search chats…'),
      'hit'
    )
    // Close before the 150 ms debounce fires.
    await userEvent.keyboard('{Escape}')
    await new Promise((resolve) => setTimeout(resolve, 250))

    await userEvent.click(screen.getByText('open'))
    expect(await screen.findByText('Recent chat')).toBeInTheDocument()
    expect(screen.queryByText('Search hit')).not.toBeInTheDocument()
    expect(searchThreads).not.toHaveBeenCalled()
  })
})
