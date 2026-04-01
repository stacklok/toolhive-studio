import { render, screen } from '@testing-library/react'
import { expect, it, describe } from 'vitest'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { CardSkill } from '../card-skill'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'

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

const baseSkill: InstalledSkill = {
  reference: 'ghcr.io/org/my-skill:v1',
  status: 'installed',
  scope: 'user',
  metadata: {
    name: 'my-skill',
    description: 'A test skill description',
  },
}

describe('CardSkill', () => {
  it('renders skill name from metadata', () => {
    renderWithProviders(<CardSkill skill={baseSkill} />)
    expect(screen.getByText('my-skill')).toBeInTheDocument()
  })

  it('falls back to reference when metadata.name is absent', () => {
    const skill: InstalledSkill = {
      reference: 'ghcr.io/org/my-skill:v1',
      status: 'installed',
      scope: 'user',
    }
    renderWithProviders(<CardSkill skill={skill} />)
    // Reference appears as the title (fallback) and also as the monospace ref text
    expect(
      screen.getAllByText('ghcr.io/org/my-skill:v1').length
    ).toBeGreaterThan(0)
  })

  it('shows "Unknown skill" when neither name nor reference', () => {
    const skill: InstalledSkill = {}
    renderWithProviders(<CardSkill skill={skill} />)
    expect(screen.getByText('Unknown skill')).toBeInTheDocument()
  })

  it('renders description when present', () => {
    renderWithProviders(<CardSkill skill={baseSkill} />)
    expect(screen.getByText('A test skill description')).toBeInTheDocument()
  })

  it('renders reference in monospace', () => {
    renderWithProviders(<CardSkill skill={baseSkill} />)
    const refElement = screen.getByText('ghcr.io/org/my-skill:v1')
    expect(refElement).toHaveClass('font-mono')
  })

  it('shows status badge with "installed" variant', () => {
    renderWithProviders(
      <CardSkill skill={{ ...baseSkill, status: 'installed' }} />
    )
    expect(screen.getByText('installed')).toBeInTheDocument()
  })

  it('shows scope badge', () => {
    renderWithProviders(<CardSkill skill={{ ...baseSkill, scope: 'user' }} />)
    expect(screen.getByText('user')).toBeInTheDocument()
  })

  it('opens uninstall dialog when Uninstall button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CardSkill skill={baseSkill} />)

    await user.click(screen.getByRole('button', { name: /uninstall/i }))

    expect(
      screen.getByRole('heading', { name: /uninstall skill/i })
    ).toBeInTheDocument()
  })
})
