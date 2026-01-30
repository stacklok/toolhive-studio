import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CodeBlockWithCopy } from '../code-block-with-copy'

// Ensure clipboard exists for jsdom
if (!navigator.clipboard) {
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CodeBlockWithCopy', () => {
  it('renders the code content', () => {
    render(<CodeBlockWithCopy code="brew uninstall thv" />)

    expect(screen.getByText('brew uninstall thv')).toBeVisible()
  })

  it('renders a copy button', () => {
    render(<CodeBlockWithCopy code="brew uninstall thv" />)

    expect(screen.getByTitle('Copy command')).toBeVisible()
  })

  it('copies code to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup()
    render(<CodeBlockWithCopy code="brew uninstall thv" />)

    const copyButton = screen.getByTitle('Copy command')
    await user.click(copyButton)

    // Verify copy succeeded by checking UI state change
    await waitFor(() => {
      expect(screen.getByTitle('Copied!')).toBeVisible()
    })
  })

  it('shows check icon after successful copy', async () => {
    const user = userEvent.setup()
    render(<CodeBlockWithCopy code="test command" />)

    const copyButton = screen.getByTitle('Copy command')
    await user.click(copyButton)

    await waitFor(() => {
      expect(screen.getByTitle('Copied!')).toBeVisible()
    })
  })
})
