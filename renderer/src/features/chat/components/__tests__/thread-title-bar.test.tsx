import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ThreadTitleBar } from '../thread-title-bar'

// Mock useConfirm — each test can override mockConfirm.mockResolvedValue
const mockConfirm = vi.fn()
vi.mock('@/common/hooks/use-confirm', () => ({
  useConfirm: () => mockConfirm,
}))

function renderBar(props: React.ComponentProps<typeof ThreadTitleBar> = {}) {
  return render(<ThreadTitleBar {...props} />)
}

describe('ThreadTitleBar', () => {
  beforeEach(() => {
    mockConfirm.mockResolvedValue(true)
  })

  describe('display', () => {
    it('renders the provided title', () => {
      renderBar({ title: 'My thread' })
      expect(screen.getByText('My thread')).toBeInTheDocument()
    })

    it('renders "New chat" when title is undefined', () => {
      renderBar()
      expect(screen.getByText('New chat')).toBeInTheDocument()
    })

    it('does not render pencil button when onRename is not provided', () => {
      renderBar({ title: 'Hello' })
      expect(
        screen.queryByRole('button', { name: /rename/i })
      ).not.toBeInTheDocument()
    })

    it('does not render star button when onToggleStar is not provided', () => {
      renderBar({ title: 'Hello' })
      expect(
        screen.queryByRole('button', { name: /star/i })
      ).not.toBeInTheDocument()
    })

    it('does not render delete button when onDelete is not provided', () => {
      renderBar({ title: 'Hello' })
      expect(
        screen.queryByRole('button', { name: /delete/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('star button', () => {
    it('shows "Star thread" aria-label when not starred', () => {
      renderBar({ title: 'Hello', starred: false, onToggleStar: vi.fn() })
      expect(
        screen.getByRole('button', { name: /star thread/i })
      ).toBeInTheDocument()
    })

    it('shows "Unstar thread" aria-label when starred', () => {
      renderBar({ title: 'Hello', starred: true, onToggleStar: vi.fn() })
      expect(
        screen.getByRole('button', { name: /unstar thread/i })
      ).toBeInTheDocument()
    })

    it('calls onToggleStar when clicked', async () => {
      const onToggleStar = vi.fn()
      renderBar({ title: 'Hello', onToggleStar })
      await userEvent.click(screen.getByRole('button', { name: /star/i }))
      expect(onToggleStar).toHaveBeenCalledOnce()
    })
  })

  describe('rename flow', () => {
    it('clicking the title text enters rename mode', async () => {
      renderBar({ title: 'My thread', onRename: vi.fn() })
      await userEvent.click(screen.getByText('My thread'))
      expect(
        screen.getByRole('textbox', { name: /rename thread/i })
      ).toBeInTheDocument()
    })

    it('clicking the pencil button enters rename mode', async () => {
      renderBar({ title: 'My thread', onRename: vi.fn() })
      await userEvent.click(
        screen.getByRole('button', { name: /rename thread/i })
      )
      expect(
        screen.getByRole('textbox', { name: /rename thread/i })
      ).toBeInTheDocument()
    })

    it('pre-fills the input with the current title', async () => {
      renderBar({ title: 'My thread', onRename: vi.fn() })
      await userEvent.click(
        screen.getByRole('button', { name: /rename thread/i })
      )
      expect(
        screen.getByRole('textbox', { name: /rename thread/i })
      ).toHaveValue('My thread')
    })

    it('pre-fills with empty string when title is undefined', async () => {
      renderBar({ onRename: vi.fn() })
      await userEvent.click(
        screen.getByRole('button', { name: /rename thread/i })
      )
      expect(
        screen.getByRole('textbox', { name: /rename thread/i })
      ).toHaveValue('')
    })

    it('commits rename on Enter and calls onRename', async () => {
      const onRename = vi.fn()
      renderBar({ title: 'Old title', onRename })
      await userEvent.click(
        screen.getByRole('button', { name: /rename thread/i })
      )
      const input = screen.getByRole('textbox', { name: /rename thread/i })
      await userEvent.clear(input)
      await userEvent.type(input, 'New title{Enter}')
      expect(onRename).toHaveBeenCalledWith('New title')
      // Returns to display mode
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('commits rename on blur and calls onRename', async () => {
      const onRename = vi.fn()
      renderBar({ title: 'Old title', onRename })
      await userEvent.click(
        screen.getByRole('button', { name: /rename thread/i })
      )
      const input = screen.getByRole('textbox', { name: /rename thread/i })
      await userEvent.clear(input)
      await userEvent.type(input, 'Blurred title')
      await userEvent.tab()
      expect(onRename).toHaveBeenCalledWith('Blurred title')
    })

    it('trims whitespace before calling onRename', async () => {
      const onRename = vi.fn()
      renderBar({ title: 'Old', onRename })
      await userEvent.click(
        screen.getByRole('button', { name: /rename thread/i })
      )
      const input = screen.getByRole('textbox', { name: /rename thread/i })
      await userEvent.clear(input)
      await userEvent.type(input, '  Trimmed  {Enter}')
      expect(onRename).toHaveBeenCalledWith('Trimmed')
    })

    it('does not call onRename when value is unchanged', async () => {
      const onRename = vi.fn()
      renderBar({ title: 'Same title', onRename })
      await userEvent.click(
        screen.getByRole('button', { name: /rename thread/i })
      )
      await userEvent.keyboard('{Enter}')
      expect(onRename).not.toHaveBeenCalled()
    })

    it('does not call onRename when input is cleared to empty', async () => {
      const onRename = vi.fn()
      renderBar({ title: 'Something', onRename })
      await userEvent.click(
        screen.getByRole('button', { name: /rename thread/i })
      )
      const input = screen.getByRole('textbox', { name: /rename thread/i })
      await userEvent.clear(input)
      await userEvent.keyboard('{Enter}')
      expect(onRename).not.toHaveBeenCalled()
    })

    it('cancels rename on Escape without calling onRename', async () => {
      const onRename = vi.fn()
      renderBar({ title: 'My thread', onRename })
      await userEvent.click(
        screen.getByRole('button', { name: /rename thread/i })
      )
      await userEvent.type(
        screen.getByRole('textbox', { name: /rename thread/i }),
        'Changed{Escape}'
      )
      expect(onRename).not.toHaveBeenCalled()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('pencil button is hidden while rename input is shown', async () => {
      renderBar({ title: 'Hello', onRename: vi.fn() })
      await userEvent.click(
        screen.getByRole('button', { name: /rename thread/i })
      )
      expect(
        screen.queryByRole('button', { name: /rename thread/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('delete with confirmation', () => {
    it('shows delete button when onDelete is provided', () => {
      renderBar({ title: 'Hello', onDelete: vi.fn() })
      expect(
        screen.getByRole('button', { name: /delete thread/i })
      ).toBeInTheDocument()
    })

    it('calls onDelete when confirm resolves true', async () => {
      const onDelete = vi.fn()
      mockConfirm.mockResolvedValue(true)
      renderBar({ title: 'Hello', onDelete })
      await userEvent.click(
        screen.getByRole('button', { name: /delete thread/i })
      )
      expect(mockConfirm).toHaveBeenCalled()
      await vi.waitFor(() => expect(onDelete).toHaveBeenCalledOnce())
    })

    it('does NOT call onDelete when confirm resolves false', async () => {
      const onDelete = vi.fn()
      mockConfirm.mockResolvedValue(false)
      renderBar({ title: 'Hello', onDelete })
      await userEvent.click(
        screen.getByRole('button', { name: /delete thread/i })
      )
      await vi.waitFor(() => expect(mockConfirm).toHaveBeenCalled())
      expect(onDelete).not.toHaveBeenCalled()
    })

    it('includes the thread title in the confirm message', async () => {
      mockConfirm.mockResolvedValue(false)
      renderBar({ title: 'Important chat', onDelete: vi.fn() })
      await userEvent.click(
        screen.getByRole('button', { name: /delete thread/i })
      )
      await vi.waitFor(() => expect(mockConfirm).toHaveBeenCalled())
      const [message] = mockConfirm.mock.calls[0] as [string]
      expect(message).toContain('Important chat')
    })

    it('uses "New chat" in confirm message when title is undefined', async () => {
      mockConfirm.mockResolvedValue(false)
      renderBar({ onDelete: vi.fn() })
      await userEvent.click(
        screen.getByRole('button', { name: /delete thread/i })
      )
      await vi.waitFor(() => expect(mockConfirm).toHaveBeenCalled())
      const [message] = mockConfirm.mock.calls[0] as [string]
      expect(message).toContain('New chat')
    })
  })
})
