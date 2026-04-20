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
    expect(screen.getByText('ghcr.io/org/my-skill:v1')).toBeInTheDocument()
  })

  it('shows "Unknown skill" when neither name nor reference', () => {
    const skill: InstalledSkill = {}
    renderWithProviders(<CardSkill skill={skill} />)
    expect(screen.getByText('Unknown skill')).toBeInTheDocument()
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

  describe('client badges overflow', () => {
    it('renders all clients inline when count is at or below the cap', () => {
      renderWithProviders(
        <CardSkill
          skill={{ ...baseSkill, clients: ['cursor', 'claude-code', 'codex'] }}
        />
      )

      expect(screen.getByText('cursor')).toBeInTheDocument()
      expect(screen.getByText('claude-code')).toBeInTheDocument()
      expect(screen.getByText('codex')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /more clients/i })
      ).not.toBeInTheDocument()
    })

    it('caps visible client badges at 3 and shows a "+N" overflow trigger', () => {
      const clients = ['cursor', 'claude-code', 'codex', 'vscode', 'windsurf']
      renderWithProviders(<CardSkill skill={{ ...baseSkill, clients }} />)

      expect(screen.getByText('cursor')).toBeInTheDocument()
      expect(screen.getByText('claude-code')).toBeInTheDocument()
      expect(screen.getByText('codex')).toBeInTheDocument()
      expect(screen.queryByText('vscode')).not.toBeInTheDocument()
      expect(screen.queryByText('windsurf')).not.toBeInTheDocument()

      const overflow = screen.getByRole('button', { name: '2 more clients' })
      expect(overflow).toBeInTheDocument()
      expect(overflow).toHaveTextContent('+2')
    })

    it('reveals hidden clients in the overflow tooltip on focus', async () => {
      const clients = ['cursor', 'claude-code', 'codex', 'vscode', 'windsurf']
      renderWithProviders(<CardSkill skill={{ ...baseSkill, clients }} />)

      const overflow = screen.getByRole('button', { name: '2 more clients' })
      overflow.focus()

      expect(await screen.findByText('vscode')).toBeInTheDocument()
      expect(screen.getByText('windsurf')).toBeInTheDocument()
    })
  })

  describe('project-scoped card layout', () => {
    it('shows project root badge derived from project_root', () => {
      renderWithProviders(
        <CardSkill
          skill={{
            ...baseSkill,
            scope: 'project',
            project_root: '/Users/me/code/my-repo',
          }}
        />
      )

      expect(screen.getByText('/my-repo')).toBeInTheDocument()
    })
  })
})
