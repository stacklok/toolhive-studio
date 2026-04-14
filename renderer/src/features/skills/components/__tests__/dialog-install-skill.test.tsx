import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi, describe, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { DialogInstallSkill } from '../dialog-install-skill'
import { recordRequests } from '@/common/mocks/node'
import { mockedGetApiV1BetaDiscoveryClients } from '@/common/mocks/fixtures/discovery_clients/get'
import { mockedPostApiV1BetaSkills } from '@/common/mocks/fixtures/skills/post'

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

beforeEach(() => {
  // Default: no installed clients so we get the empty state for clients field
  mockedGetApiV1BetaDiscoveryClients.activateScenario('empty')
})

describe('DialogInstallSkill', () => {
  it('renders all form fields', async () => {
    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: /install skill/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/name or reference/i)).toBeInTheDocument()
    expect(screen.getByText(/scope/i)).toBeInTheDocument()
    expect(screen.getAllByText(/clients/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/version/i)).toBeInTheDocument()
  })

  it('prefills name from defaultReference prop', () => {
    renderWithProviders(
      <DialogInstallSkill
        open
        onOpenChange={vi.fn()}
        defaultReference="ghcr.io/org/skill:v1"
      />
    )

    expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
      'ghcr.io/org/skill:v1'
    )
  })

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^install$/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/name or reference is required/i)
      ).toBeInTheDocument()
    })
  })

  it('sends POST to /api/v1beta/skills without clients when none selected', async () => {
    const user = userEvent.setup()
    const rec = recordRequests()

    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await user.type(
      screen.getByLabelText(/name or reference/i),
      'ghcr.io/org/skill:v1'
    )
    await user.click(screen.getByRole('button', { name: /^install$/i }))

    await waitFor(() => {
      const postCall = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/skills'
      )
      expect(postCall).toBeDefined()
      expect(postCall?.payload).toMatchObject({
        name: 'ghcr.io/org/skill:v1',
        scope: 'user',
      })
      expect(postCall?.payload).not.toHaveProperty('clients')
    })
  })

  it('sends clients array when specific clients are checked', async () => {
    // Suppress React 19 + Radix "suspended inside act" warning during dropdown close
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    const rec = recordRequests()
    mockedGetApiV1BetaDiscoveryClients.reset()

    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await user.type(screen.getByLabelText(/name or reference/i), 'my-skill')

    // Wait for clients dropdown to appear, open it, and select two clients
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /select clients/i })
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /select clients/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('menuitemcheckbox', { name: 'claude-code' })
      ).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole('menuitemcheckbox', { name: 'claude-code' })
    )
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'opencode' }))

    // Radix traps focus in the dropdown and sets pointer-events:none on the
    // dialog, so submit the form via keyboard instead of clicking Install
    await user.keyboard('{Escape}')
    // Wait for dropdown to close and dialog to regain pointer events
    await waitFor(() => {
      expect(screen.queryByRole('menuitemcheckbox')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /^install$/i }))

    await waitFor(() => {
      const postCall = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/skills'
      )
      expect(postCall).toBeDefined()
      expect(postCall?.payload).toMatchObject({
        name: 'my-skill',
        scope: 'user',
        clients: expect.arrayContaining(['claude-code', 'opencode']),
      })
      expect((postCall?.payload as { clients: string[] }).clients).toHaveLength(
        2
      )
    })

    consoleSpy.mockRestore()
  })

  it('shows project_root field only when scope is "project"', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    expect(screen.queryByText(/project root/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /scope/i }))
    await user.click(screen.getByRole('option', { name: /project/i }))

    await waitFor(() => {
      expect(screen.getByText(/project root/i)).toBeInTheDocument()
    })
  })

  it('requires project_root when scope is "project"', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await user.type(screen.getByLabelText(/name or reference/i), 'my-skill')

    await user.click(screen.getByRole('combobox', { name: /scope/i }))
    await user.click(screen.getByRole('option', { name: /project/i }))

    await user.click(screen.getByRole('button', { name: /^install$/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/project root is required for project scope/i)
      ).toBeInTheDocument()
    })
  })

  it('native folder picker sets project_root', async () => {
    const user = userEvent.setup()
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue('/my/project')

    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox', { name: /scope/i }))
    await user.click(screen.getByRole('option', { name: /project/i }))

    await waitFor(() => {
      expect(screen.getByText(/project root/i)).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole('button', { name: /browse for project folder/i })
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/select project folder/i)).toHaveValue(
        '/my/project'
      )
    })
  })

  it('renders dropdown items for each skill-supporting client when clients are available', async () => {
    const user = userEvent.setup()
    mockedGetApiV1BetaDiscoveryClients.reset()

    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /select clients/i })
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /select clients/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('menuitemcheckbox', { name: 'claude-code' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('menuitemcheckbox', { name: 'opencode' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('menuitemcheckbox', { name: 'codex' })
      ).toBeInTheDocument()
    })
  })

  it('shows only clients that support skills in the dropdown', async () => {
    const user = userEvent.setup()
    mockedGetApiV1BetaDiscoveryClients.reset()

    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /select clients/i })
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /select clients/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('menuitemcheckbox', { name: 'claude-code' })
      ).toBeInTheDocument()
    })

    // Installed clients without supports_skills should NOT appear
    expect(
      screen.queryByRole('menuitemcheckbox', { name: 'cline' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('menuitemcheckbox', { name: 'cursor' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('menuitemcheckbox', { name: 'vscode' })
    ).not.toBeInTheDocument()
  })

  it('shows empty state message when no skill-supporting clients are detected', async () => {
    // beforeEach already activates 'empty' scenario
    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(
        screen.getByText(/no skill-supporting clients detected/i)
      ).toBeInTheDocument()
    })
  })

  it('shows "all detected clients" placeholder when no clients are selected', async () => {
    mockedGetApiV1BetaDiscoveryClients.reset()

    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /select clients/i })
      ).toHaveTextContent(/all detected clients/i)
    })
  })

  it('shows error alert inside the dialog when install fails', async () => {
    const user = userEvent.setup()
    mockedPostApiV1BetaSkills.activateScenario('server-error')

    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await user.type(screen.getByLabelText(/name or reference/i), 'my-skill')
    await user.click(screen.getByRole('button', { name: /^install$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('clears the error alert when the dialog is closed', async () => {
    const user = userEvent.setup()
    mockedPostApiV1BetaSkills.activateScenario('server-error')

    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await user.type(screen.getByLabelText(/name or reference/i), 'my-skill')
    await user.click(screen.getByRole('button', { name: /^install$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // Cancel runs handleClose which clears the error
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('calls onOpenChange(false) after successful install', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    renderWithProviders(<DialogInstallSkill open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText(/name or reference/i), 'my-skill')
    await user.click(screen.getByRole('button', { name: /^install$/i }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
