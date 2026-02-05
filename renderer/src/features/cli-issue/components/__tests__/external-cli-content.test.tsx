import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExternalCliContent } from '../external-cli-content'

const mockWriteText = vi.fn()

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

beforeEach(() => {
  vi.clearAllMocks()
  navigator.clipboard.writeText = mockWriteText
  mockWriteText.mockResolvedValue(undefined)
})

describe('ExternalCliContent', () => {
  const defaultProps = {
    cli: {
      path: '/opt/homebrew/bin/thv',
      version: '0.7.0',
      source: 'homebrew' as const,
    },
    onCheckAgain: vi.fn(),
    isLoading: false,
  }

  it('renders the title and description', () => {
    render(<ExternalCliContent {...defaultProps} />)

    expect(screen.getByText('External ToolHive CLI Detected')).toBeVisible()
    expect(
      screen.getByText(
        'ToolHive UI cannot run while an external CLI is installed.'
      )
    ).toBeVisible()
  })

  it('displays CLI path and version', () => {
    render(<ExternalCliContent {...defaultProps} />)

    expect(screen.getByText(/\/opt\/homebrew\/bin\/thv/)).toBeVisible()
    expect(screen.getByText(/version 0\.7\.0/)).toBeVisible()
  })

  it('displays source label for Homebrew', () => {
    render(<ExternalCliContent {...defaultProps} />)

    expect(screen.getByText('Homebrew')).toBeVisible()
  })

  it('displays Homebrew uninstall command', () => {
    render(<ExternalCliContent {...defaultProps} />)

    expect(screen.getByText('brew uninstall thv')).toBeVisible()
  })

  it('displays source label for Winget', () => {
    render(
      <ExternalCliContent
        {...defaultProps}
        cli={{
          path: 'C:\\Program Files\\toolhive\\thv.exe',
          version: '0.7.0',
          source: 'winget',
        }}
      />
    )

    expect(screen.getByText('Winget')).toBeVisible()
  })

  it('displays Winget uninstall command', () => {
    render(
      <ExternalCliContent
        {...defaultProps}
        cli={{
          path: 'C:\\Program Files\\toolhive\\thv.exe',
          version: '0.7.0',
          source: 'winget',
        }}
      />
    )

    expect(screen.getByText('winget uninstall thv')).toBeVisible()
  })

  it('displays manual uninstall message for manual source', () => {
    render(
      <ExternalCliContent
        {...defaultProps}
        cli={{
          path: '/usr/local/bin/thv',
          version: null,
          source: 'manual',
        }}
      />
    )

    expect(screen.getByText('Manual installation')).toBeVisible()
    expect(
      screen.getByText(
        'Please manually remove the external ToolHive CLI installation.'
      )
    ).toBeVisible()
  })

  it('does not show version when not available', () => {
    render(
      <ExternalCliContent
        {...defaultProps}
        cli={{
          path: '/usr/local/bin/thv',
          version: null,
          source: 'manual',
        }}
      />
    )

    // Check that "version X.Y.Z" pattern is not present (the word "version" appears in other text)
    expect(screen.queryByText(/version \d+\.\d+\.\d+/)).not.toBeInTheDocument()
  })

  it('calls onCheckAgain when button is clicked', async () => {
    const onCheckAgain = vi.fn()
    const user = userEvent.setup()

    render(<ExternalCliContent {...defaultProps} onCheckAgain={onCheckAgain} />)

    const button = screen.getByRole('button', { name: /check again/i })
    await user.click(button)

    expect(onCheckAgain).toHaveBeenCalledTimes(1)
  })

  it('disables button when loading', () => {
    render(<ExternalCliContent {...defaultProps} isLoading={true} />)

    const button = screen.getByRole('button', { name: /check again/i })
    expect(button).toBeDisabled()
  })

  it('renders Check Again button', () => {
    render(<ExternalCliContent {...defaultProps} />)

    expect(screen.getByRole('button', { name: /check again/i })).toBeVisible()
  })
})
