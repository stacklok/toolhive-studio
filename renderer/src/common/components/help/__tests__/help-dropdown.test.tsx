import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewsletterModalProvider } from '@/common/contexts/newsletter-modal-provider'
import { HelpDropdown } from '../help-dropdown'
import {
  DISCORD_URL,
  DOCS_BASE_URL,
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
} from '@common/app-info'

function renderHelpDropdown(options?: { isEnterprise?: boolean }) {
  const isEnterprise = options?.isEnterprise ?? false
  return render(
    <NewsletterModalProvider>
      <HelpDropdown isEnterprise={isEnterprise} />
    </NewsletterModalProvider>
  )
}

describe('HelpDropdown', () => {
  it('renders documentation link with correct href', async () => {
    const user = userEvent.setup()
    renderHelpDropdown()

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const documentationLink = screen.getByRole('menuitem', {
      name: /documentation/i,
    })
    expect(documentationLink).toHaveAttribute('href', DOCS_BASE_URL)
    expect(documentationLink).toHaveAttribute('target', '_blank')
    expect(documentationLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders Discord link with correct href', async () => {
    const user = userEvent.setup()
    renderHelpDropdown()

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const discordLink = screen.getByRole('menuitem', {
      name: /discord community/i,
    })
    expect(discordLink).toHaveAttribute('href', DISCORD_URL)
    expect(discordLink).toHaveAttribute('target', '_blank')
    expect(discordLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders feedback link with correct href', async () => {
    const user = userEvent.setup()
    renderHelpDropdown()

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const feedbackLink = screen.getByRole('menuitem', {
      name: /send feedback/i,
    })
    expect(feedbackLink).toHaveAttribute('href', GITHUB_ISSUES_URL)
    expect(feedbackLink).toHaveAttribute('target', '_blank')
    expect(feedbackLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders GitHub repository link with correct href', async () => {
    const user = userEvent.setup()
    renderHelpDropdown()

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    const githubLink = screen.getByRole('menuitem', {
      name: /github repository/i,
    })
    expect(githubLink).toHaveAttribute('href', GITHUB_REPO_URL)
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders newsletter menu item', async () => {
    const user = userEvent.setup()
    renderHelpDropdown()

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    expect(
      screen.getByRole('menuitem', { name: /newsletter/i })
    ).toBeInTheDocument()
  })

  it('does not render newsletter menu item when isEnterprise is true', async () => {
    const user = userEvent.setup()
    renderHelpDropdown({ isEnterprise: true })

    const helpButton = screen.getByRole('button', { name: /help/i })
    await user.click(helpButton)

    expect(
      screen.queryByRole('menuitem', { name: /newsletter/i })
    ).not.toBeInTheDocument()
  })
})
