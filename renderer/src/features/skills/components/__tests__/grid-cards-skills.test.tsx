import { render, screen } from '@testing-library/react'
import { expect, it, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { GridCardsSkills } from '../grid-cards-skills'
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

const testSkills: InstalledSkill[] = [
  {
    reference: 'ghcr.io/org/skill-one:v1',
    status: 'installed',
    scope: 'user',
    metadata: { name: 'skill-one' },
  },
  {
    reference: 'ghcr.io/org/skill-two:v1',
    status: 'installed',
    scope: 'user',
    metadata: { name: 'skill-two' },
  },
  {
    reference: 'ghcr.io/org/skill-three:v1',
    status: 'installed',
    scope: 'user',
    metadata: { name: 'skill-three' },
  },
]

describe('GridCardsSkills', () => {
  it('renders a card for each skill', () => {
    renderWithProviders(<GridCardsSkills skills={testSkills} />)

    expect(screen.getByText('skill-one')).toBeInTheDocument()
    expect(screen.getByText('skill-two')).toBeInTheDocument()
    expect(screen.getByText('skill-three')).toBeInTheDocument()
  })

  it('shows empty filter message when skills array is empty', () => {
    renderWithProviders(<GridCardsSkills skills={[]} />)

    expect(
      screen.getByText('No skills found matching the current filter')
    ).toBeInTheDocument()
  })
})
