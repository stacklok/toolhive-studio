import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaygroundSidebar } from '../playground-sidebar'
import type { PlaygroundThread } from '../../hooks/use-playground-threads'

const mockConfirm = vi.fn()
vi.mock('@/common/hooks/use-confirm', () => ({
  useConfirm: () => mockConfirm,
}))

const NOW = new Date('2024-01-15T12:00:00Z').getTime()

const makeThread = (
  overrides: Partial<PlaygroundThread> = {}
): PlaygroundThread => ({
  id: 'thread-1',
  title: 'My thread',
  starred: false,
  lastEditTimestamp: NOW - 2 * 60 * 1000, // 2 minutes ago
  createdAt: NOW - 10 * 60 * 1000,
  ...overrides,
})

const defaultProps = {
  threads: [makeThread()],
  activeThreadId: null as string | null,
  onSelectThread: vi.fn(),
  onCreateThread: vi.fn(),
  onDeleteThread: vi.fn(),
  onRenameThread: vi.fn(),
  onToggleStar: vi.fn(),
}

function renderSidebar(props: Partial<typeof defaultProps> = {}) {
  return render(<PlaygroundSidebar {...defaultProps} {...props} />)
}

describe('PlaygroundSidebar', () => {
  beforeEach(() => {
    mockConfirm.mockResolvedValue(true)
    // Reset all callback mocks
    Object.assign(defaultProps, {
      onSelectThread: vi.fn(),
      onCreateThread: vi.fn(),
      onDeleteThread: vi.fn(),
      onRenameThread: vi.fn(),
      onToggleStar: vi.fn(),
    })
  })

  describe('thread list', () => {
    it('renders thread titles', () => {
      renderSidebar({
        threads: [
          makeThread({ id: 't1', title: 'First thread' }),
          makeThread({ id: 't2', title: 'Second thread' }),
        ],
      })
      expect(screen.getByText('First thread')).toBeInTheDocument()
      expect(screen.getByText('Second thread')).toBeInTheDocument()
    })

    it('renders "New chat" for threads without a title', () => {
      renderSidebar({ threads: [makeThread({ title: undefined })] })
      // Scope to <nav> to avoid matching the "New chat" button at the top of the sidebar
      const nav = screen.getByRole('navigation')
      expect(within(nav).getByText('New chat')).toBeInTheDocument()
    })

    it('calls onSelectThread with the thread id when clicked', async () => {
      const onSelectThread = vi.fn()
      renderSidebar({
        threads: [makeThread({ id: 'thread-abc' })],
        onSelectThread,
      })
      await userEvent.click(screen.getByText('My thread'))
      expect(onSelectThread).toHaveBeenCalledWith('thread-abc')
    })

    it('calls onCreateThread when the new chat button is clicked', async () => {
      const onCreateThread = vi.fn()
      renderSidebar({ onCreateThread })
      await userEvent.click(screen.getByRole('button', { name: /new chat/i }))
      expect(onCreateThread).toHaveBeenCalledOnce()
    })
  })

  describe('section grouping', () => {
    it('does not show section headers when no threads are starred', () => {
      renderSidebar({
        threads: [
          makeThread({ id: 't1', starred: false }),
          makeThread({ id: 't2', starred: false, title: 'Other' }),
        ],
      })
      expect(screen.queryByText('Starred')).not.toBeInTheDocument()
      expect(screen.queryByText('Recents')).not.toBeInTheDocument()
    })

    it('shows "Starred" and "Recents" headers when at least one thread is starred', () => {
      renderSidebar({
        threads: [
          makeThread({ id: 't1', starred: true, title: 'Fav' }),
          makeThread({ id: 't2', starred: false, title: 'Regular' }),
        ],
      })
      expect(screen.getByText('Starred')).toBeInTheDocument()
      expect(screen.getByText('Recents')).toBeInTheDocument()
    })

    it('renders starred threads before recents', () => {
      renderSidebar({
        threads: [
          makeThread({ id: 't1', starred: false, title: 'Regular thread' }),
          makeThread({ id: 't2', starred: true, title: 'Starred thread' }),
        ],
      })
      const items = screen.getAllByRole('listitem')
      const starredIndex = items.findIndex((li) =>
        li.textContent?.includes('Starred thread')
      )
      const regularIndex = items.findIndex((li) =>
        li.textContent?.includes('Regular thread')
      )
      expect(starredIndex).toBeLessThan(regularIndex)
    })
  })

  describe('three-dot context menu', () => {
    async function openMenu(threadTitle = 'My thread') {
      // The menu button is only visible on hover — simulate hover then click
      const listItem = screen.getByText(threadTitle).closest('li')!
      // The MoreHorizontal button becomes visible via CSS group-hover; click it directly
      const menuButton = within(listItem).getByRole('button', {
        name: /thread options/i,
      })
      await userEvent.click(menuButton)
    }

    it('shows Star option for an unstarred thread', async () => {
      renderSidebar({ threads: [makeThread({ starred: false })] })
      await openMenu()
      expect(
        await screen.findByRole('menuitem', { name: /^star$/i })
      ).toBeInTheDocument()
    })

    it('shows Unstar option for a starred thread', async () => {
      renderSidebar({ threads: [makeThread({ starred: true })] })
      await openMenu()
      expect(
        await screen.findByRole('menuitem', { name: /unstar/i })
      ).toBeInTheDocument()
    })

    it('calls onToggleStar with thread id when Star/Unstar is clicked', async () => {
      const onToggleStar = vi.fn()
      renderSidebar({
        threads: [makeThread({ id: 'thread-1', starred: false })],
        onToggleStar,
      })
      await openMenu()
      await userEvent.click(
        await screen.findByRole('menuitem', { name: /^star$/i })
      )
      expect(onToggleStar).toHaveBeenCalledWith('thread-1')
    })

    it('enters rename mode when Rename is clicked in menu', async () => {
      renderSidebar()
      await openMenu()
      await userEvent.click(
        await screen.findByRole('menuitem', { name: /rename/i })
      )
      expect(
        screen.getByRole('textbox', { name: /rename thread/i })
      ).toBeInTheDocument()
    })

    it('calls onRenameThread with id and new title when rename is committed', async () => {
      const onRenameThread = vi.fn()
      renderSidebar({
        threads: [makeThread({ id: 'thread-1', title: 'Old title' })],
        onRenameThread,
      })
      await openMenu('Old title')
      await userEvent.click(
        await screen.findByRole('menuitem', { name: /rename/i })
      )
      const input = screen.getByRole('textbox', { name: /rename thread/i })
      await userEvent.clear(input)
      await userEvent.type(input, 'New title{Enter}')
      expect(onRenameThread).toHaveBeenCalledWith('thread-1', 'New title')
    })

    it('shows Delete option in menu', async () => {
      renderSidebar()
      await openMenu()
      expect(
        await screen.findByRole('menuitem', { name: /delete/i })
      ).toBeInTheDocument()
    })

    it('calls onDeleteThread when Delete is confirmed', async () => {
      const onDeleteThread = vi.fn()
      mockConfirm.mockResolvedValue(true)
      renderSidebar({
        threads: [makeThread({ id: 'thread-1' })],
        onDeleteThread,
      })
      await openMenu()
      await userEvent.click(
        await screen.findByRole('menuitem', { name: /delete/i })
      )
      await vi.waitFor(() =>
        expect(onDeleteThread).toHaveBeenCalledWith('thread-1')
      )
    })

    it('does NOT call onDeleteThread when Delete is cancelled', async () => {
      const onDeleteThread = vi.fn()
      mockConfirm.mockResolvedValue(false)
      renderSidebar({
        threads: [makeThread({ id: 'thread-1' })],
        onDeleteThread,
      })
      await openMenu()
      await userEvent.click(
        await screen.findByRole('menuitem', { name: /delete/i })
      )
      await vi.waitFor(() => expect(mockConfirm).toHaveBeenCalled())
      expect(onDeleteThread).not.toHaveBeenCalled()
    })
  })

  describe('inline rename via double-click', () => {
    it('enters rename mode on double-click of the thread button', async () => {
      renderSidebar()
      const threadButton = screen.getByText('My thread')
      await userEvent.dblClick(threadButton)
      expect(
        screen.getByRole('textbox', { name: /rename thread/i })
      ).toBeInTheDocument()
    })

    it('Escape cancels rename without calling onRenameThread', async () => {
      const onRenameThread = vi.fn()
      renderSidebar({ onRenameThread })
      await userEvent.dblClick(screen.getByText('My thread'))
      await userEvent.keyboard('{Escape}')
      expect(onRenameThread).not.toHaveBeenCalled()
    })

    it('does not call onRenameThread when title is unchanged', async () => {
      const onRenameThread = vi.fn()
      renderSidebar({
        threads: [makeThread({ title: 'Unchanged' })],
        onRenameThread,
      })
      await userEvent.dblClick(screen.getByText('Unchanged'))
      await userEvent.keyboard('{Enter}')
      expect(onRenameThread).not.toHaveBeenCalled()
    })
  })

  describe('relative timestamps', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(NOW)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows "just now" for very recent threads', () => {
      renderSidebar({
        threads: [makeThread({ lastEditTimestamp: NOW - 30 * 1000 })],
      })
      expect(screen.getByText('just now')).toBeInTheDocument()
    })

    it('shows minutes ago', () => {
      renderSidebar({
        threads: [makeThread({ lastEditTimestamp: NOW - 5 * 60 * 1000 })],
      })
      expect(screen.getByText('5m ago')).toBeInTheDocument()
    })

    it('shows hours ago', () => {
      renderSidebar({
        threads: [makeThread({ lastEditTimestamp: NOW - 3 * 60 * 60 * 1000 })],
      })
      expect(screen.getByText('3h ago')).toBeInTheDocument()
    })

    it('shows days ago', () => {
      renderSidebar({
        threads: [
          makeThread({ lastEditTimestamp: NOW - 2 * 24 * 60 * 60 * 1000 }),
        ],
      })
      expect(screen.getByText('2d ago')).toBeInTheDocument()
    })

    it('shows a date for threads older than 7 days', () => {
      renderSidebar({
        threads: [
          makeThread({ lastEditTimestamp: NOW - 10 * 24 * 60 * 60 * 1000 }),
        ],
      })
      // The format is e.g. "Jan 5" — just check it doesn't contain "ago"
      const time = screen.queryByText(/ago/)
      expect(time).not.toBeInTheDocument()
    })
  })
})
