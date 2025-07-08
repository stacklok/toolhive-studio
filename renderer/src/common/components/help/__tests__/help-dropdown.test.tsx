import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelpDropdown } from '../help-dropdown'

describe('HelpDropdown', () => {
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
      'https://github.com/stacklok/toolhive-studio?tab=readme-ov-file#getting-started'
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
      'https://github.com/stacklok/toolhive-studio/issues'
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
      'https://github.com/stacklok/toolhive-studio'
    )
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
