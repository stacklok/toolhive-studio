// Delay is globally mocked in vitest.setup.ts via @utils/delay
// Toast API is globally mocked in vitest.setup.ts via sonner

// Mock server readiness polling to remove background delays while preserving toasts
vi.mock('@/common/hooks/use-check-server-status', () => ({
  useCheckServerStatus: () => ({
    checkServerStatus: async ({
      quietly = false,
      customLoadingMessage,
      customSuccessMessage,
    }: {
      quietly?: boolean
      customSuccessMessage?: string
      customLoadingMessage?: string
    }): Promise<boolean> => {
      if (!quietly) {
        const { toast } = await import('sonner')
        if (customLoadingMessage) {
          toast.loading(customLoadingMessage, {
            duration: 30_000,
            id: 'wizard-status',
          })
        }
        if (customSuccessMessage) {
          toast.success(customSuccessMessage, {
            duration: 5_000,
            id: 'wizard-status',
          })
        }
      }
      return true
    },
  }),
}))

import {
  screen,
  waitFor,
  within,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { RegistryGroupDetail } from '@/routes/(registry)/registry-group_.$name'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import { recordRequests } from '@/common/mocks/node'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { mockedGetApiV1BetaWorkloads } from '@/common/mocks/fixtures/workloads/get'
import { mockedGetApiV1BetaRegistryByName } from '@/common/mocks/fixtures/registry_name/get'
import { mockedGetApiV1BetaDiscoveryClients } from '@/common/mocks/fixtures/discovery_clients/get'

const mockUseParams = vi.fn(() => ({ name: 'dev-toolkit' }))

afterEach(() => {
  mockUseParams.mockReturnValue({ name: 'dev-toolkit' })
  // Ensure timers are reset even if a test fails early
  vi.useRealTimers()
})

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useParams: () => mockUseParams(),
  }
})

function WrapperComponent() {
  return (
    <>
      <RegistryGroupDetail />
    </>
  )
}

describe('Registry Group Detail Route', () => {
  it('displays group name as a page heading', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })
  })

  it('displays group description under the heading', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Essential tools for development')).toBeVisible()
    })
  })

  it('shows a table of servers with Server and Description columns', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    const table = screen.getByRole('table')
    expect(table).toBeVisible()
    expect(screen.getByRole('columnheader', { name: /server/i })).toBeVisible()
    expect(
      screen.getByRole('columnheader', { name: /description/i })
    ).toBeVisible()

    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(1)
    const atlassianRow = rows.find((row) =>
      within(row).queryByText(/^atlassian$/i)
    )
    expect(atlassianRow).toBeTruthy()
    expect(
      within(atlassianRow!).getByText(/connect to atlassian/i)
    ).toBeVisible()
  })

  it('contains expected server rows', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    const table = screen.getByRole('table')
    const allRows = within(table).getAllByRole('row')
    const bodyRows = allRows.slice(1)
    const data = bodyRows.map((row) => {
      const cells = within(row).getAllByRole('cell')
      return cells.map((cell) => cell.textContent?.trim() || '')
    })

    expect(
      data.some(
        ([server, desc]) =>
          server === 'atlassian' &&
          desc ===
            'Connect to Atlassian products like Confluence, Jira Cloud and Server/Data deployments.'
      )
    ).toBe(true)
  })

  it('has a back button that navigates to registry', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText(/dev-toolkit/i)).toBeVisible()
    })

    const backButton = screen.getByRole('button', { name: /back/i })
    expect(backButton).toBeVisible()
    expect(backButton.closest('a')).toHaveAttribute('href', '/registry')

    await userEvent.click(backButton)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/registry')
    })
  })

  it('renders a different group with multiple servers (proves component is dynamic)', async () => {
    mockUseParams.mockReturnValue({ name: 'ai-tools' })

    mockedGetApiV1BetaRegistryByName.override(() => ({
      registry: {
        servers: {},
        groups: [
          {
            name: 'ai-tools',
            description: 'AI and machine learning tools',
            servers: {
              'openai-server': {
                name: 'openai-server',
                image: 'ghcr.io/example/openai:latest',
                description: 'OpenAI API integration for Claude',
                tier: 'Official',
                status: 'Active',
                transport: 'stdio',
                permissions: {},
                tools: ['chat', 'completion'],
                env_vars: [],
                args: [],
                metadata: {
                  stars: 500,
                  pulls: 2000,
                  last_updated: '2025-01-01T00:00:00Z',
                },
                repository_url: 'https://github.com/example/openai',
                tags: ['ai', 'openai'],
              },
              'anthropic-server': {
                name: 'anthropic-server',
                image: 'ghcr.io/example/anthropic:latest',
                description: 'Anthropic API tools and utilities',
                tier: 'Official',
                status: 'Active',
                transport: 'stdio',
                permissions: {},
                tools: ['messages'],
                env_vars: [],
                args: [],
                metadata: {
                  stars: 800,
                  pulls: 3000,
                  last_updated: '2025-01-02T00:00:00Z',
                },
                repository_url: 'https://github.com/example/anthropic',
                tags: ['ai', 'anthropic'],
              },
            },
            remote_servers: {
              'huggingface-remote': {
                name: 'huggingface-remote',
                description: 'HuggingFace model inference',
                url: 'https://huggingface.co/api',
                tier: 'Community',
                status: 'Active',
                tools: ['inference', 'models'],
                metadata: {
                  stars: 1200,
                  last_updated: '2025-01-03T00:00:00Z',
                },
                repository_url: 'https://github.com/example/huggingface',
                tags: ['ai', 'ml'],
              },
            },
          },
        ],
      },
    }))

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'ai-tools' })).toBeVisible()
    })
    expect(screen.getByText('AI and machine learning tools')).toBeVisible()

    const table = screen.getByRole('table')
    const allRows = within(table).getAllByRole('row')
    const bodyRows = allRows.slice(1) // skip header row

    expect(bodyRows).toHaveLength(3)

    expect(screen.getByText('openai-server')).toBeVisible()
    expect(screen.getByText('OpenAI API integration for Claude')).toBeVisible()

    expect(screen.getByText('anthropic-server')).toBeVisible()
    expect(screen.getByText('Anthropic API tools and utilities')).toBeVisible()

    expect(screen.getByText('huggingface-remote')).toBeVisible()
    expect(screen.getByText('HuggingFace model inference')).toBeVisible()
  })

  it('opens install wizard when clicking Install group button', async () => {
    const rec = recordRequests()

    mockedGetApiV1BetaWorkloads.override((data) => ({
      ...data,
      workloads: data.workloads?.filter(
        (workload) => workload.name !== 'first-server'
      ),
    }))

    mockUseParams.mockReturnValue({ name: 'two-server-group' })

    mockedGetApiV1BetaRegistryByName.override(() => ({
      registry: {
        servers: {},
        groups: [
          {
            name: 'two-server-group',
            description: 'A group with two servers',
            servers: {
              'first-server': {
                name: 'first-server',
                image: 'ghcr.io/example/first:latest',
                description: 'First server',
                tier: 'Official',
                status: 'Active',
                transport: 'stdio',
                permissions: {},
                tools: ['tool1'],
                env_vars: [],
                args: [],
                metadata: {
                  stars: 100,
                  pulls: 1000,
                  last_updated: '2025-01-01T00:00:00Z',
                },
                repository_url: 'https://github.com/example/first',
                tags: ['test'],
              },
              'second-server': {
                name: 'second-server',
                image: 'ghcr.io/example/second:latest',
                description: 'Second server',
                tier: 'Official',
                status: 'Active',
                transport: 'stdio',
                permissions: {},
                tools: ['tool2'],
                env_vars: [],
                args: [],
                metadata: {
                  stars: 200,
                  pulls: 2000,
                  last_updated: '2025-01-02T00:00:00Z',
                },
                repository_url: 'https://github.com/example/second',
                tags: ['test'],
              },
            },
            remote_servers: {},
          },
        ],
      },
    }))

    mockedGetApiV1BetaDiscoveryClients.override(() => ({
      clients: [
        {
          client_type: 'claude-code',
          installed: true,
          registered: true,
        },
      ],
    }))

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'two-server-group' })
      ).toBeVisible()
    })

    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure first-server/i })
      ).toBeVisible()
    })

    expect(screen.getByText('Installing server 1 of 2')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^next$/i }))
    {
      const h2 = screen.queryByRole('heading', {
        name: /configure first-server/i,
      })
      if (h2) {
        await waitForElementToBeRemoved(h2)
      }
    }
    const secondServerHeading2 = await screen.findByRole('heading', {
      name: /configure second-server/i,
    })
    expect(secondServerHeading2).toBeVisible()

    expect(screen.getByText('Installing server 2 of 2')).toBeInTheDocument()

    // Clear any previous toast calls before the final server
    vi.mocked(toast.warning).mockClear()
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.loading).mockClear()

    await userEvent.click(screen.getByRole('button', { name: /^finish$/i }))
    // The wizard closes the dialog before emitting readiness toasts
    const dialog = screen.queryByRole('dialog')
    if (dialog) {
      await waitForElementToBeRemoved(dialog)
    }

    const groupCalls = rec.recordedRequests.filter(
      (r) => r.method === 'POST' && r.pathname === '/api/v1beta/groups'
    )
    const workloadCalls = rec.recordedRequests.filter(
      (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
    )

    await waitFor(() => {
      expect(groupCalls).toHaveLength(1)
    })
    expect(groupCalls[0]?.payload).toEqual({ name: 'two-server-group' })

    // Verify that the group creation success toast is NOT shown while dialog is open
    // The toast is shown via toast.promise, so check that the success message is NOT in any call
    const hasGroupCreationToast = vi
      .mocked(toast.promise)
      .mock.calls.some((call) => {
        const options = call[1] as { success?: string }
        return (
          options?.success === 'Group "two-server-group" created successfully'
        )
      })
    expect(hasGroupCreationToast).toBe(false)

    // For the LAST server only, toasts SHOULD be shown with custom messages
    // Wait for the async checkServerStatus to complete
    await waitFor(() => {
      expect(toast.loading).toHaveBeenCalledWith(
        'Creating "two-server-group" group...',
        expect.objectContaining({
          duration: 30_000,
        })
      )
    })

    // Check toast.success was called for the group creation
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Group "two-server-group" created successfully',
        expect.objectContaining({
          duration: 5_000,
        })
      )
    })

    expect(workloadCalls).toHaveLength(2)
    expect(workloadCalls[0]?.payload).toMatchObject({
      name: 'first-server',
      group: 'two-server-group',
    })
    expect(workloadCalls[1]?.payload).toMatchObject({
      name: 'second-server',
      group: 'two-server-group',
    })

    // Verify API call order: group creation MUST happen before any workload creation
    const postRequests = rec.recordedRequests.filter((r) => r.method === 'POST')
    const groupIndex = postRequests.findIndex((r) =>
      r.pathname.includes('/groups')
    )
    const firstWorkloadIndex = postRequests.findIndex((r) =>
      r.pathname.includes('/workloads')
    )
    expect(groupIndex).toBeLessThan(firstWorkloadIndex)

    // The wizard should NOT automatically navigate to the group
    // User should use the View button in the toast instead
    expect(router.state.location.pathname).not.toBe('/group/two-server-group')
  })

  it('resets form with correct server names when navigating between servers', async () => {
    mockUseParams.mockReturnValue({ name: 'multi-server-group' })

    mockedGetApiV1BetaWorkloads.override((data) => ({
      ...data,
      workloads: data.workloads?.filter(
        (workload) => workload.name !== 'fetch'
      ),
    }))

    mockedGetApiV1BetaRegistryByName.override(() => ({
      registry: {
        servers: {},
        groups: [
          {
            name: 'multi-server-group',
            description: 'A group with multiple servers',
            servers: {
              fetch: {
                name: 'fetch',
                image: 'ghcr.io/example/fetch:latest',
                description: 'Fetch server',
                tier: 'Official',
                status: 'Active',
                transport: 'stdio',
                permissions: {},
                tools: ['fetch'],
                env_vars: [],
                args: [],
                metadata: {
                  stars: 100,
                  pulls: 1000,
                  last_updated: '2025-01-01T00:00:00Z',
                },
                repository_url: 'https://github.com/example/fetch',
                tags: ['test'],
              },
              filesystem: {
                name: 'filesystem',
                image: 'ghcr.io/example/filesystem:latest',
                description: 'Filesystem server',
                tier: 'Official',
                status: 'Active',
                transport: 'stdio',
                permissions: {},
                tools: ['read_file', 'write_file'],
                env_vars: [],
                args: [],
                metadata: {
                  stars: 200,
                  pulls: 2000,
                  last_updated: '2025-01-02T00:00:00Z',
                },
                repository_url: 'https://github.com/example/filesystem',
                tags: ['test'],
              },
            },
            remote_servers: {},
          },
        ],
      },
    }))

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'multi-server-group' })
      ).toBeVisible()
    })

    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure fetch/i })
      ).toBeVisible()
    })

    expect(screen.getByText('Installing server 1 of 2')).toBeInTheDocument()

    const firstServerNameInput = screen.getByLabelText(/server name/i)
    expect(firstServerNameInput).toHaveValue('fetch')

    const nextButton = screen.getByRole('button', { name: /next/i })
    await userEvent.click(nextButton)

    // Wait for the 2-second loading delay before the next form appears
    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { name: /configure filesystem/i })
        ).toBeVisible()
      },
      { timeout: 5000 }
    )

    expect(screen.getByText('Installing server 2 of 2')).toBeInTheDocument()

    const secondServerNameInput = screen.getByLabelText(/server name/i)
    expect(secondServerNameInput).toHaveValue('filesystem')
  })

  it('shows alert banner when group has no servers and hides the button', async () => {
    mockUseParams.mockReturnValue({ name: 'empty-group' })

    mockedGetApiV1BetaRegistryByName.override(() => ({
      registry: {
        servers: {},
        groups: [
          {
            name: 'empty-group',
            description: 'A group with no servers',
            servers: {},
            remote_servers: {},
          },
        ],
      },
    }))

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'empty-group' })).toBeVisible()
    })
    expect(screen.getByText('A group with no servers')).toBeVisible()

    expect(screen.getByRole('alert')).toBeVisible()
    expect(
      screen.getByText('This group does not have any servers.')
    ).toBeVisible()

    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    expect(
      screen.queryByRole('button', { name: /install group/i })
    ).not.toBeInTheDocument()
  })
})
