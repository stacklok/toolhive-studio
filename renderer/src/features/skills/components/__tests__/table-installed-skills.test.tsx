import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { TableInstalledSkills } from '../table-installed-skills'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'

function renderWithProviders(component: React.ReactElement) {
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

const userSkill: InstalledSkill = {
  reference: 'ghcr.io/org/skill-user:v1',
  status: 'installed',
  scope: 'user',
  metadata: { name: 'skill-user' },
  clients: ['claude-code', 'cursor', 'vscode', 'windsurf'],
}

const projectSkill: InstalledSkill = {
  reference: 'ghcr.io/org/skill-repo:v1',
  status: 'pending',
  scope: 'project',
  metadata: { name: 'skill-repo' },
  project_root: '/Users/me/Projects/my-project',
  clients: ['claude-code'],
}

describe('TableInstalledSkills', () => {
  it('renders all column headers and one row per skill', () => {
    renderWithProviders(
      <TableInstalledSkills skills={[userSkill, projectSkill]} />
    )

    expect(
      screen.getByRole('columnheader', { name: /skill/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /mode/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /destination/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /status/i })
    ).toBeInTheDocument()

    expect(screen.getByText('skill-user')).toBeVisible()
    expect(screen.getByText('skill-repo')).toBeVisible()
  })

  it('shows client badges and a +N overflow chip for user-scoped skills', () => {
    renderWithProviders(<TableInstalledSkills skills={[userSkill]} />)

    expect(screen.getByText('claude-code')).toBeVisible()
    expect(screen.getByText('cursor')).toBeVisible()
    expect(screen.getByText('vscode')).toBeVisible()
    expect(screen.getByText(/\+1/)).toBeVisible()
  })

  it('renders the Repo mode label and project-root chip for project-scoped skills', () => {
    renderWithProviders(<TableInstalledSkills skills={[projectSkill]} />)

    expect(screen.getByText('Repo')).toBeVisible()
    expect(screen.getByText('/my-project')).toBeVisible()
  })

  it('renders the installed status badge with the expected variant', () => {
    renderWithProviders(<TableInstalledSkills skills={[userSkill]} />)

    expect(screen.getByText('installed')).toBeVisible()
  })

  it('opens the uninstall dialog when the uninstall button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TableInstalledSkills skills={[userSkill]} />)

    await user.click(
      screen.getByRole('button', { name: /uninstall skill-user/i })
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(
      screen.getByRole('heading', { name: /uninstall skill/i })
    ).toBeVisible()
  })

  it('shows an empty state when the skills array is empty', () => {
    renderWithProviders(<TableInstalledSkills skills={[]} />)

    expect(
      screen.getByText(/no skills found matching the current filter/i)
    ).toBeVisible()
  })
})
