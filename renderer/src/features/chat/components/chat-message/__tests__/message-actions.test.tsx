import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageActions } from '../message-actions'

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

const writeText = vi.fn()
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  writable: true,
  configurable: true,
})

describe('MessageActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    writeText.mockResolvedValue(undefined)
  })

  it('renders a Copy message button when copyText is non-empty', () => {
    render(<MessageActions copyText="hello world" />)
    expect(
      screen.getByRole('button', { name: 'Copy message' })
    ).toBeInTheDocument()
  })

  it('copies the provided text to the clipboard and toasts on click', async () => {
    render(<MessageActions copyText="hello world" />)

    await userEvent.click(screen.getByRole('button', { name: 'Copy message' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('hello world'))
    expect(mockToastSuccess).toHaveBeenCalledWith('Copied to clipboard')
  })

  it('surfaces an error toast when the clipboard write fails', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    render(<MessageActions copyText="hello world" />)

    await userEvent.click(screen.getByRole('button', { name: 'Copy message' }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Failed to copy to clipboard')
    )
  })

  it('renders an Edit button when onEdit is supplied and fires it on click', async () => {
    const onEdit = vi.fn()
    render(<MessageActions copyText="hello" onEdit={onEdit} />)

    const editButton = screen.getByRole('button', { name: 'Edit message' })
    expect(editButton).toBeInTheDocument()

    await userEvent.click(editButton)
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('does not render an Edit button when onEdit is not supplied', () => {
    render(<MessageActions copyText="hello" />)
    expect(
      screen.queryByRole('button', { name: /edit/i })
    ).not.toBeInTheDocument()
  })

  it('is non-interactive while hidden — pointer-events disabled by default, re-enabled on hover/focus', () => {
    // The wrapper relies on `pointer-events-none` to prevent accidental
    // clicks on the invisible button before it's revealed. The reveal
    // selectors must re-enable interaction.
    const { container } = render(<MessageActions copyText="hello" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toMatch(/\bpointer-events-none\b/)
    expect(wrapper.className).toMatch(/group-hover:pointer-events-auto/)
    expect(wrapper.className).toMatch(/focus-within:pointer-events-auto/)
  })
})
