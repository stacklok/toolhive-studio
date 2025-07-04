import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelpDropdown } from '../help-dropdown'

// Mock the electronAPI
const mockOpenExternal = vi.fn()
Object.defineProperty(window, 'electronAPI', {
  value: {
    openExternal: mockOpenExternal,
  },
  writable: true,
})

describe('HelpDropdown', () => {
  beforeEach(() => {
    mockOpenExternal.mockClear()
  })

  it('renders help icon button', () => {
    render(<HelpDropdown />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    expect(helpButton).toBeInTheDocument()
  })

  it('opens dropdown menu when clicked', async () => {
    const user = userEvent.setup()
    render(<HelpDropdown />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    expect(screen.getByText('Documentation')).toBeInTheDocument()
    expect(screen.getByText('Discord Community')).toBeInTheDocument()
    expect(screen.getByText('Send Feedback')).toBeInTheDocument()
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument()
  })

  it('opens documentation link when clicked', async () => {
    const user = userEvent.setup()
    render(<HelpDropdown />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const documentationItem = screen.getByText('Documentation')
    await user.click(documentationItem)

    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://github.com/StacklokLabs/toolhive-studio?tab=readme-ov-file#getting-started'
    )
  })

  it('opens Discord link when clicked', async () => {
    const user = userEvent.setup()
    render(<HelpDropdown />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const discordItem = screen.getByText('Discord Community')
    await user.click(discordItem)

    expect(mockOpenExternal).toHaveBeenCalledWith('https://discord.gg/stacklok')
  })

  it('opens feedback link when clicked', async () => {
    const user = userEvent.setup()
    render(<HelpDropdown />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const feedbackItem = screen.getByText('Send Feedback')
    await user.click(feedbackItem)

    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://github.com/StacklokLabs/toolhive-studio/issues'
    )
  })

  it('opens GitHub repository link when clicked', async () => {
    const user = userEvent.setup()
    render(<HelpDropdown />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const githubItem = screen.getByText('GitHub Repository')
    await user.click(githubItem)

    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://github.com/StacklokLabs/toolhive-studio'
    )
  })

  it('applies custom className', () => {
    render(<HelpDropdown className="custom-class" />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    expect(helpButton).toHaveClass('custom-class')
  })
})
