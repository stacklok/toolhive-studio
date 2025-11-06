import { screen, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { RegistryGroupDetail } from '@/routes/(registry)/registry-group_.$name'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import { server } from '@/common/mocks/node'
import userEvent from '@testing-library/user-event'
import type { V1GetRegistryResponse } from '@api/types.gen'

const mockUseParams = vi.fn(() => ({ name: 'dev-toolkit' }))

afterEach(() => {
  mockUseParams.mockReturnValue({ name: 'dev-toolkit' })
})

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useParams: () => mockUseParams(),
  }
})

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
  },
}))

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

    const customRegistry: V1GetRegistryResponse = {
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
    }

    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(customRegistry)
      })
    )

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
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    const installButton = screen.getByRole('button', { name: /install group/i })
    expect(installButton).toBeVisible()

    await userEvent.click(installButton)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure atlassian/i })
      ).toBeVisible()
    })

    expect(screen.getByRole('tab', { name: /configuration/i })).toBeVisible()
    expect(
      screen.getByRole('tab', { name: /network isolation/i })
    ).toBeVisible()
  })

  it('shows Finish button on the last server in wizard', async () => {
    mockUseParams.mockReturnValue({ name: 'two-server-group' })

    const twoServerRegistry: V1GetRegistryResponse = {
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
    }

    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(twoServerRegistry)
      })
    )

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

    expect(screen.getByRole('button', { name: /^next$/i })).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: /^next$/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure second-server/i })
      ).toBeVisible()
    })

    expect(screen.getByRole('button', { name: /^finish$/i })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /^next$/i })
    ).not.toBeInTheDocument()
  })

  it('makes API calls and navigates to group page after installing all servers', async () => {
    const groupCalls: Array<{ name: string }> = []
    const workloadCalls: Array<{ name: string; group: string }> = []
    const apiCallOrder: Array<'group' | 'workload'> = []

    mockUseParams.mockReturnValue({ name: 'two-server-group' })

    const twoServerRegistry: V1GetRegistryResponse = {
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
    }

    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(twoServerRegistry)
      }),
      http.post('*/api/v1beta/groups', async ({ request }) => {
        const body = (await request.json()) as {
          name: string
        }
        groupCalls.push({ name: body.name })
        apiCallOrder.push('group')
        return HttpResponse.json({
          name: body.name,
        })
      }),
      http.post('*/api/v1beta/workloads', async ({ request }) => {
        const body = (await request.json()) as { name: string; group: string }
        workloadCalls.push({ name: body.name, group: body.group })
        apiCallOrder.push('workload')
        return HttpResponse.json({
          name: body.name,
          group: body.group,
          status: 'running',
        })
      })
    )

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

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure second-server/i })
      ).toBeVisible()
    })

    expect(screen.getByText('Installing server 2 of 2')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^finish$/i }))

    await waitFor(() => {
      expect(groupCalls).toHaveLength(1)
    })
    expect(groupCalls[0]).toEqual({
      name: 'two-server-group',
    })

    expect(workloadCalls).toHaveLength(2)
    expect(workloadCalls[0]).toEqual({
      name: 'first-server',
      group: 'two-server-group',
    })
    expect(workloadCalls[1]).toEqual({
      name: 'second-server',
      group: 'two-server-group',
    })

    // Verify API call order: group creation MUST happen before any workload creation
    expect(apiCallOrder).toEqual(['group', 'workload', 'workload'])
    expect(apiCallOrder[0]).toBe('group')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/group/two-server-group')
    })
  })

  it('resets form with correct server names when navigating between servers', async () => {
    mockUseParams.mockReturnValue({ name: 'multi-server-group' })

    const multiServerRegistry: V1GetRegistryResponse = {
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
    }

    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(multiServerRegistry)
      })
    )

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

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure filesystem/i })
      ).toBeVisible()
    })

    expect(screen.getByText('Installing server 2 of 2')).toBeInTheDocument()

    const secondServerNameInput = screen.getByLabelText(/server name/i)
    expect(secondServerNameInput).toHaveValue('filesystem')
  })

  it('shows alert banner when group has no servers and hides the button', async () => {
    mockUseParams.mockReturnValue({ name: 'empty-group' })

    const emptyGroupRegistry: V1GetRegistryResponse = {
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
    }

    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(emptyGroupRegistry)
      })
    )

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

  it('allows configuring env vars and secrets during wizard flow', async () => {
    const workloadCalls: Array<{
      name: string
      env_vars?: Record<string, string>
      secrets?: Array<{ name: string; target: string }>
    }> = []

    mockUseParams.mockReturnValue({ name: 'config-test-group' })

    const configTestRegistry: V1GetRegistryResponse = {
      registry: {
        servers: {},
        groups: [
          {
            name: 'config-test-group',
            description: 'A group for testing configuration',
            servers: {
              'config-server': {
                name: 'config-server',
                image: 'ghcr.io/example/config:latest',
                description: 'Server with configuration options',
                tier: 'Official',
                status: 'Active',
                transport: 'stdio',
                permissions: {},
                tools: ['tool1'],
                env_vars: [
                  {
                    name: 'API_ENDPOINT',
                    description: 'API endpoint URL',
                    required: false,
                    default: 'https://default.example.com',
                  },
                  {
                    name: 'API_KEY',
                    description: 'API authentication key',
                    secret: true,
                    required: false,
                    default: '',
                  },
                ],
                args: [],
                metadata: {
                  stars: 100,
                  pulls: 1000,
                  last_updated: '2025-01-01T00:00:00Z',
                },
                repository_url: 'https://github.com/example/config',
                tags: ['test'],
              },
            },
            remote_servers: {},
          },
        ],
      },
    }

    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(configTestRegistry)
      }),
      http.post('*/api/v1beta/groups', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        return HttpResponse.json({ name: body.name })
      }),
      http.post('*/api/v1beta/workloads', async ({ request }) => {
        const body = (await request.json()) as {
          name: string
          env_vars?: Record<string, string>
          secrets?: Array<{ name: string; target: string }>
        }
        workloadCalls.push({
          name: body.name,
          env_vars: body.env_vars,
          secrets: body.secrets,
        })
        return HttpResponse.json({
          name: body.name,
          status: 'running',
        })
      }),
      http.post('*/api/v1beta/secrets/default/keys', async ({ request }) => {
        const body = (await request.json()) as { target: string; value: string }
        return HttpResponse.json({
          name: `secret-${body.target}`,
          target: body.target,
        })
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'config-test-group' })
      ).toBeVisible()
    })

    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure config-server/i })
      ).toBeVisible()
    })

    const apiEndpointInput = screen.getByLabelText(/API_ENDPOINT value/i)
    expect(apiEndpointInput).toBeVisible()
    expect(apiEndpointInput).toHaveValue('https://default.example.com')

    const apiKeyInput = screen.getByLabelText(/API_KEY value/i)
    expect(apiKeyInput).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: /^finish$/i }))

    await waitFor(() => {
      expect(workloadCalls).toHaveLength(1)
    })

    expect(workloadCalls[0]?.env_vars).toBeDefined()
    expect(workloadCalls[0]?.env_vars?.API_ENDPOINT).toBe(
      'https://default.example.com'
    )
  })

  it('allows configuring network isolation during wizard flow', async () => {
    const workloadCalls: Array<{
      name: string
      network_isolation?: boolean
      permission_profile?: {
        network?: {
          outbound?: {
            allow_host?: string[]
            allow_port?: number[]
            insecure_allow_all?: boolean
          }
        }
      }
    }> = []

    mockUseParams.mockReturnValue({ name: 'network-test-group' })

    const networkTestRegistry: V1GetRegistryResponse = {
      registry: {
        servers: {},
        groups: [
          {
            name: 'network-test-group',
            description: 'A group for testing network isolation',
            servers: {
              'network-server': {
                name: 'network-server',
                image: 'ghcr.io/example/network:latest',
                description: 'Server with network permissions',
                tier: 'Official',
                status: 'Active',
                transport: 'stdio',
                permissions: {
                  network: {
                    outbound: {
                      allow_host: ['example.com', 'api.github.com'],
                      allow_port: [443, 8080],
                      insecure_allow_all: false,
                    },
                  },
                },
                tools: ['tool1'],
                env_vars: [],
                args: [],
                metadata: {
                  stars: 100,
                  pulls: 1000,
                  last_updated: '2025-01-01T00:00:00Z',
                },
                repository_url: 'https://github.com/example/network',
                tags: ['test'],
              },
            },
            remote_servers: {},
          },
        ],
      },
    }

    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(networkTestRegistry)
      }),
      http.post('*/api/v1beta/groups', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        return HttpResponse.json({ name: body.name })
      }),
      http.post('*/api/v1beta/workloads', async ({ request }) => {
        const body = (await request.json()) as {
          name: string
          network_isolation?: boolean
          permission_profile?: {
            network?: {
              outbound?: {
                allow_host?: string[]
                allow_port?: number[]
                insecure_allow_all?: boolean
              }
            }
          }
        }
        workloadCalls.push({
          name: body.name,
          network_isolation: body.network_isolation,
          permission_profile: body.permission_profile,
        })
        return HttpResponse.json({
          name: body.name,
          status: 'running',
        })
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'network-test-group' })
      ).toBeVisible()
    })

    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure network-server/i })
      ).toBeVisible()
    })

    const networkIsolationTab = screen.getByRole('tab', {
      name: /network isolation/i,
    })
    await userEvent.click(networkIsolationTab)

    await waitFor(() => {
      expect(
        screen.getByText(/enable outbound network filtering/i)
      ).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /^finish$/i }))

    await waitFor(() => {
      expect(workloadCalls).toHaveLength(1)
    })
  })

  it('allows configuring storage volumes during wizard flow', async () => {
    const workloadCalls: Array<{
      name: string
      volumes?: Array<{ host: string; container: string; mode?: string }>
    }> = []

    mockUseParams.mockReturnValue({ name: 'volume-test-group' })

    const volumeTestRegistry: V1GetRegistryResponse = {
      registry: {
        servers: {},
        groups: [
          {
            name: 'volume-test-group',
            description: 'A group for testing volume configuration',
            servers: {
              'volume-server': {
                name: 'volume-server',
                image: 'ghcr.io/example/volume:latest',
                description: 'Server with volume support',
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
                repository_url: 'https://github.com/example/volume',
                tags: ['test'],
              },
            },
            remote_servers: {},
          },
        ],
      },
    }

    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(volumeTestRegistry)
      }),
      http.post('*/api/v1beta/groups', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        return HttpResponse.json({ name: body.name })
      }),
      http.post('*/api/v1beta/workloads', async ({ request }) => {
        const body = (await request.json()) as {
          name: string
          volumes?: Array<{ host: string; container: string; mode?: string }>
        }
        workloadCalls.push({
          name: body.name,
          volumes: body.volumes,
        })
        return HttpResponse.json({
          name: body.name,
          status: 'running',
        })
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'volume-test-group' })
      ).toBeVisible()
    })

    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure volume-server/i })
      ).toBeVisible()
    })

    await waitFor(() => {
      expect(screen.getByText(/storage volumes/i)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /^finish$/i }))

    await waitFor(() => {
      expect(workloadCalls).toHaveLength(1)
    })
  })
})
