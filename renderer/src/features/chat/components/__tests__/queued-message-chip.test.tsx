import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FileUIPart } from 'ai'
import { QueuedMessageChip } from '../queued-message-chip'

describe('QueuedMessageChip', () => {
  it('renders the text preview', () => {
    render(
      <QueuedMessageChip
        queuedMessage={{ text: 'hello there' }}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('queued-message-chip')).toBeInTheDocument()
    expect(screen.getByText('hello there')).toBeInTheDocument()
  })

  it('truncates very long text with an ellipsis', () => {
    const long = 'a'.repeat(120)
    render(
      <QueuedMessageChip queuedMessage={{ text: long }} onCancel={vi.fn()} />
    )
    const chip = screen.getByTestId('queued-message-chip')
    // Truncated preview is < the input length, has a trailing ellipsis.
    expect(chip.textContent).toContain('…')
    expect(chip.textContent ?? '').not.toContain(long)
  })

  it('shows file count when files are present', () => {
    const files = [
      { type: 'file' as const, mediaType: 'image/png', url: 'a' },
      { type: 'file' as const, mediaType: 'image/png', url: 'b' },
    ] satisfies FileUIPart[]
    render(
      <QueuedMessageChip
        queuedMessage={{ text: 'check these', files }}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('queued-message-chip').textContent).toContain(
      '· 2 files'
    )
  })

  it('uses singular "file" when only one file is attached', () => {
    const files = [
      { type: 'file' as const, mediaType: 'image/png', url: 'a' },
    ] satisfies FileUIPart[]
    render(
      <QueuedMessageChip
        queuedMessage={{ text: 'one', files }}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByTestId('queued-message-chip').textContent).toContain(
      '· 1 file'
    )
  })

  it('cancel button invokes onCancel', async () => {
    const onCancel = vi.fn()
    render(
      <QueuedMessageChip
        queuedMessage={{ text: 'cancel me' }}
        onCancel={onCancel}
      />
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancel queued message' })
    )
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
