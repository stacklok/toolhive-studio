import { render, screen } from '@testing-library/react'
import { expect, it, describe } from 'vitest'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { CardBuild } from '../card-build'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

const baseBuild: LocalBuild = {
  name: 'my-skill',
  description: 'A locally built skill',
  tag: 'localhost/my-skill:v1.0.0',
  version: 'v1.0.0',
  digest:
    'sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
}

describe('CardBuild', () => {
  it('renders skill name from build.name', () => {
    renderWithProviders(<CardBuild build={baseBuild} />)
    expect(screen.getByText('my-skill')).toBeInTheDocument()
  })

  it('falls back to tag when name is absent', () => {
    const build: LocalBuild = { tag: 'localhost/my-skill:v1.0.0' }
    renderWithProviders(<CardBuild build={build} />)
    expect(
      screen.getAllByText('localhost/my-skill:v1.0.0').length
    ).toBeGreaterThan(0)
  })

  it('shows "Unnamed build" when neither name nor tag', () => {
    renderWithProviders(<CardBuild build={{}} />)
    expect(screen.getByText('Unnamed build')).toBeInTheDocument()
  })

  it('renders description when present', () => {
    renderWithProviders(<CardBuild build={baseBuild} />)
    expect(screen.getByText('A locally built skill')).toBeInTheDocument()
  })

  it('renders version badge', () => {
    renderWithProviders(<CardBuild build={baseBuild} />)
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })

  it('renders a truncated digest', () => {
    renderWithProviders(<CardBuild build={baseBuild} />)
    expect(screen.getByText(/sha256:/)).toBeInTheDocument()
  })

  it('opens install dialog when Install button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CardBuild build={baseBuild} />)

    await user.click(screen.getByRole('button', { name: /install my-skill/i }))

    expect(
      screen.getByRole('heading', { name: /install skill/i })
    ).toBeInTheDocument()
  })

  it('prefills install dialog with the build tag as reference', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CardBuild build={baseBuild} />)

    await user.click(screen.getByRole('button', { name: /install my-skill/i }))

    expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
      'localhost/my-skill:v1.0.0'
    )
  })

  it('opens remove dialog when Remove button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CardBuild build={baseBuild} />)

    await user.click(screen.getByRole('button', { name: /remove my-skill/i }))

    expect(
      screen.getByRole('heading', { name: /remove build/i })
    ).toBeInTheDocument()
  })

  it('shows build name in remove dialog confirmation text', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CardBuild build={baseBuild} />)

    await user.click(screen.getByRole('button', { name: /remove my-skill/i }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('my-skill')
  })
})
