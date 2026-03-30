import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi, describe, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { DialogInstallSkill } from '../dialog-install-skill'
import { recordRequests } from '@/common/mocks/node'
import { mockedGetApiV1BetaDiscoveryClients } from '@/common/mocks/fixtures/discovery_clients/get'

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
  // Default: no installed clients so we get plain text input for client field
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
    expect(screen.getByText(/client/i)).toBeInTheDocument()
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

  it('sends POST to /api/v1beta/skills with correct body on submit', async () => {
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
    })
  })

  it('shows project_root field only when scope is "project"', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    expect(screen.queryByText(/project root/i)).not.toBeInTheDocument()

    // Scope select accessible name comes from FormLabel "Scope"
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

  it('populates client dropdown from discovery API when clients are available', async () => {
    // Reset to default fixture which has installed clients
    mockedGetApiV1BetaDiscoveryClients.reset()

    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    // When installed clients are present, the client field renders as a Select (combobox)
    // so there are 2 comboboxes: scope + client
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(2)
    })
  })

  it('falls back to text input for client when no clients discovered', async () => {
    // beforeEach already activates 'empty' scenario
    renderWithProviders(<DialogInstallSkill open onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/e\.g\. claude-code/i)
      ).toBeInTheDocument()
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
