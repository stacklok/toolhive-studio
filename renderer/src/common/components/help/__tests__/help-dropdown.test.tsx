import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelpDropdown } from '../help-dropdown'

describe('HelpDropdown', () => {
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

  it('renders documentation link with correct href', async () => {
    const user = userEvent.setup()
    render(<HelpDropdown />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const documentationLink = screen.getByRole('menuitem', {
      name: /documentation/i,
    })
    expect(documentationLink).toHaveAttribute(
      'href',
      'https://github.com/StacklokLabs/toolhive-studio?tab=readme-ov-file#getting-started'
    )
    expect(documentationLink).toHaveAttribute('target', '_blank')
    expect(documentationLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders Discord link with correct href', async () => {
    const user = userEvent.setup()
    render(<HelpDropdown />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const discordLink = screen.getByRole('menuitem', {
      name: /discord community/i,
    })
    expect(discordLink).toHaveAttribute('href', 'https://discord.gg/stacklok')
    expect(discordLink).toHaveAttribute('target', '_blank')
    expect(discordLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders feedback link with correct href', async () => {
    const user = userEvent.setup()
    render(<HelpDropdown />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const feedbackLink = screen.getByRole('menuitem', {
      name: /send feedback/i,
    })
    expect(feedbackLink).toHaveAttribute(
      'href',
      'https://github.com/StacklokLabs/toolhive-studio/issues'
    )
    expect(feedbackLink).toHaveAttribute('target', '_blank')
    expect(feedbackLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders GitHub repository link with correct href', async () => {
    const user = userEvent.setup()
    render(<HelpDropdown />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const githubLink = screen.getByRole('menuitem', {
      name: /github repository/i,
    })
    expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/StacklokLabs/toolhive-studio'
    )
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('applies custom className', () => {
    render(<HelpDropdown className="custom-class" />)

    const helpButton = screen.getByRole('button', { name: /help/i })
    expect(helpButton).toHaveClass('custom-class')
  })
})
