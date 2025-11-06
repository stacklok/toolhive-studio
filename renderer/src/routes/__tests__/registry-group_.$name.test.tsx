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
  // Reset the mock to default value after each test
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

    // Ensure page is rendered
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    // Verify table structure
    const table = screen.getByRole('table')
    expect(table).toBeVisible()
    expect(screen.getByRole('columnheader', { name: /server/i })).toBeVisible()
    expect(
      screen.getByRole('columnheader', { name: /description/i })
    ).toBeVisible()

    // Verify at least one server row exists and contains expected data
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
    const bodyRows = allRows.slice(1) // skip header row
    const data = bodyRows.map((row) => {
      const cells = within(row).getAllByRole('cell')
      return cells.map((cell) => cell.textContent?.trim() || '')
    })

    // Should include the Atlassian server with its description
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
    // Override the mock to return a different group name
    mockUseParams.mockReturnValue({ name: 'ai-tools' })

    // Create a custom fixture with different data
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

    // Override the API response for this test
    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(customRegistry)
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    // Verify the correct group name and description are displayed
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'ai-tools' })).toBeVisible()
    })
    expect(screen.getByText('AI and machine learning tools')).toBeVisible()

    // Verify all three servers are rendered (2 local + 1 remote)
    const table = screen.getByRole('table')
    const allRows = within(table).getAllByRole('row')
    const bodyRows = allRows.slice(1) // skip header row

    expect(bodyRows).toHaveLength(3)

    // Verify each server's data
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

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    // Find and click the "Install group" button
    const installButton = screen.getByRole('button', { name: /install group/i })
    expect(installButton).toBeVisible()

    await userEvent.click(installButton)

    // Verify the install wizard dialog opens with the first server's form
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure atlassian/i })
      ).toBeVisible()
    })

    // Verify the form tabs are visible
    expect(screen.getByRole('tab', { name: /configuration/i })).toBeVisible()
    expect(
      screen.getByRole('tab', { name: /network isolation/i })
    ).toBeVisible()
  })

  it('shows Finish button on the last server in wizard', async () => {
    // Override the mock to use a group with 2 servers
    mockUseParams.mockReturnValue({ name: 'two-server-group' })

    // Create a fixture with exactly 2 servers
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

    // Override the API response for this test
    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(twoServerRegistry)
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    // Wait for page to load
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'two-server-group' })
      ).toBeVisible()
    })

    // Click "Install group" button
    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    // Wait for first server's form
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure first-server/i })
      ).toBeVisible()
    })

    // First server should show "Next" button
    expect(screen.getByRole('button', { name: /^next$/i })).toBeVisible()

    // Click Next to go to second (last) server
    await userEvent.click(screen.getByRole('button', { name: /^next$/i }))

    // Wait for second server's form
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure second-server/i })
      ).toBeVisible()
    })

    // Last server should show "Finish" button, not "Next"
    expect(screen.getByRole('button', { name: /^finish$/i })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /^next$/i })
    ).not.toBeInTheDocument()
  })

  it('makes API calls and navigates to group page after installing all servers', async () => {
    // Track API calls and their order
    const groupCalls: Array<{ name: string }> = []
    const workloadCalls: Array<{ name: string; group: string }> = []
    const apiCallOrder: Array<'group' | 'workload'> = []

    // Override the mock to use a group with 2 servers
    mockUseParams.mockReturnValue({ name: 'two-server-group' })

    // Create a fixture with exactly 2 servers
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

    // Mock the group creation and workload creation APIs
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

    // Wait for page to load
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'two-server-group' })
      ).toBeVisible()
    })

    // Click "Install group" button
    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    // Wait for first server's form
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure first-server/i })
      ).toBeVisible()
    })

    // Verify wizard progress description for first server
    expect(screen.getByText('Installing server 1 of 2')).toBeInTheDocument()

    // Click Next on first server (form submits with default values)
    await userEvent.click(screen.getByRole('button', { name: /^next$/i }))

    // Wait for second server's form
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure second-server/i })
      ).toBeVisible()
    })

    // Verify wizard progress description for second server
    expect(screen.getByText('Installing server 2 of 2')).toBeInTheDocument()

    // Click Finish on second server
    await userEvent.click(screen.getByRole('button', { name: /^finish$/i }))

    // Verify group creation was called exactly once with correct data
    await waitFor(() => {
      expect(groupCalls).toHaveLength(1)
    })
    expect(groupCalls[0]).toEqual({
      name: 'two-server-group',
    })

    // Verify both workload API calls were made with correct group name
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

    // Verify navigation to the registry group page
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/group/two-server-group')
    })
  })

  it('resets form with correct server names when navigating between servers', async () => {
    // Override the mock to use a group with multiple servers
    mockUseParams.mockReturnValue({ name: 'multi-server-group' })

    // Create a fixture with a group containing 2 servers with distinct names
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

    // Override the API response for this test
    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(multiServerRegistry)
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    // Wait for page to load
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'multi-server-group' })
      ).toBeVisible()
    })

    // Click the "Install group" button
    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    // Wait for first server's form to appear
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure fetch/i })
      ).toBeVisible()
    })

    // Verify wizard progress description for first server
    expect(screen.getByText('Installing server 1 of 2')).toBeInTheDocument()

    // Verify the server name field has "fetch" as the default value
    const firstServerNameInput = screen.getByLabelText(/server name/i)
    expect(firstServerNameInput).toHaveValue('fetch')

    // Click the Next button
    const nextButton = screen.getByRole('button', { name: /next/i })
    await userEvent.click(nextButton)

    // Wait for second server's form to appear
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure filesystem/i })
      ).toBeVisible()
    })

    // Verify wizard progress description for second server
    expect(screen.getByText('Installing server 2 of 2')).toBeInTheDocument()

    // Verify the server name field has been reset to "filesystem"
    const secondServerNameInput = screen.getByLabelText(/server name/i)
    expect(secondServerNameInput).toHaveValue('filesystem')
  })

  it('shows alert banner when group has no servers and hides the button', async () => {
    // Override the mock to return a different group name
    mockUseParams.mockReturnValue({ name: 'empty-group' })

    // Create a fixture with an empty group
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

    // Override the API response for this test
    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(emptyGroupRegistry)
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    // Verify the group name and description are displayed
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'empty-group' })).toBeVisible()
    })
    expect(screen.getByText('A group with no servers')).toBeVisible()

    // Verify the alert banner is shown
    expect(screen.getByRole('alert')).toBeVisible()
    expect(
      screen.getByText('This group does not have any servers.')
    ).toBeVisible()

    // Verify the table is NOT shown
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    // Verify the "Install group" button is NOT shown
    expect(
      screen.queryByRole('button', { name: /install group/i })
    ).not.toBeInTheDocument()
  })

  it('shows error when trying to install a group that already exists and does not create any servers', async () => {
    // Track API calls to verify NONE are made
    const groupCalls: Array<{ name: string }> = []
    const workloadCalls: Array<{ name: string }> = []

    // Override the mock to use a group with servers
    mockUseParams.mockReturnValue({ name: 'dev-toolkit' })

    // Mock the groups API to return that dev-toolkit already exists
    server.use(
      http.get('*/api/v1beta/groups', () => {
        return HttpResponse.json({
          groups: [
            {
              name: 'dev-toolkit',
              description: 'Existing group',
            },
            {
              name: 'other-group',
              description: 'Another group',
            },
          ],
        })
      }),
      http.post('*/api/v1beta/groups', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        groupCalls.push({ name: body.name })
        return HttpResponse.json({
          name: body.name,
        })
      }),
      http.post('*/api/v1beta/workloads', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        workloadCalls.push({ name: body.name })
        return HttpResponse.json({
          name: body.name,
          status: 'running',
        })
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    // Wait for validation to complete and button to be disabled
    const installButton = screen.getByRole('button', { name: /install group/i })
    await waitFor(() => {
      expect(installButton).toBeDisabled()
    })

    // Verify error message is displayed
    expect(
      screen.getByText(/group.*dev-toolkit.*already exists/i)
    ).toBeInTheDocument()

    // Verify "delete it" link is present and points to the group page
    const deleteLink = screen.getByRole('link', { name: /delete it/i })
    expect(deleteLink).toBeInTheDocument()
    expect(deleteLink).toHaveAttribute('href', '/group/dev-toolkit')

    // Verify NO API calls were made
    expect(groupCalls).toHaveLength(0)
    expect(workloadCalls).toHaveLength(0)

    // Verify wizard did not open (no server form dialogs)
    expect(
      screen.queryByRole('heading', { name: /configure/i })
    ).not.toBeInTheDocument()
  })

  it('shows error when trying to install a group with servers that conflict with existing servers and does not create any servers', async () => {
    // Track API calls to verify NONE are made
    const groupCalls: Array<{ name: string }> = []
    const workloadCalls: Array<{ name: string }> = []

    // Override the mock to use a group with servers
    mockUseParams.mockReturnValue({ name: 'dev-toolkit' })

    // Mock the workloads API to return existing servers that conflict
    server.use(
      http.get('*/api/v1beta/workloads', () => {
        return HttpResponse.json({
          workloads: [
            {
              name: 'atlassian', // Conflicts with a server in dev-toolkit
              group: 'default',
              status: 'running',
            },
            {
              name: 'other-server',
              group: 'default',
              status: 'running',
            },
          ],
        })
      }),
      http.post('*/api/v1beta/groups', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        groupCalls.push({ name: body.name })
        return HttpResponse.json({
          name: body.name,
        })
      }),
      http.post('*/api/v1beta/workloads', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        workloadCalls.push({ name: body.name })
        return HttpResponse.json({
          name: body.name,
          status: 'running',
        })
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    // Wait for validation to complete and button to be disabled
    const installButton = screen.getByRole('button', { name: /install group/i })
    await waitFor(() => {
      expect(installButton).toBeDisabled()
    })

    // Verify error message is displayed mentioning the conflicting server
    expect(
      screen.getByText(/server.*"atlassian".*already exists/i)
    ).toBeInTheDocument()

    // Verify "delete it" link is present and points to the default group page
    const deleteLink = screen.getByRole('link', { name: /delete it/i })
    expect(deleteLink).toBeInTheDocument()
    expect(deleteLink).toHaveAttribute('href', '/group/default')

    // Verify NO API calls were made
    expect(groupCalls).toHaveLength(0)
    expect(workloadCalls).toHaveLength(0)

    // Verify wizard did not open (no server form dialogs)
    expect(
      screen.queryByRole('heading', { name: /configure/i })
    ).not.toBeInTheDocument()
  })

  it('shows error with link to specific group when server conflict exists in a named group', async () => {
    // Track API calls to verify NONE are made
    const groupCalls: Array<{ name: string }> = []
    const workloadCalls: Array<{ name: string }> = []

    // Override the mock to use a group with servers
    mockUseParams.mockReturnValue({ name: 'dev-toolkit' })

    // Create a custom registry with dev-toolkit group containing a "fetch" server
    const customRegistry: V1GetRegistryResponse = {
      registry: {
        servers: {},
        groups: [
          {
            name: 'dev-toolkit',
            description: 'Dev toolkit with fetch',
            servers: {
              fetch: {
                name: 'fetch',
                image: 'ghcr.io/example/fetch:latest',
                description: 'Fetch server',
                tier: 'Community',
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
            },
            remote_servers: {},
          },
        ],
      },
    }

    // Mock the APIs
    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(customRegistry)
      }),
      http.get('*/api/v1beta/groups', () => {
        return HttpResponse.json({
          groups: [
            {
              name: 'my-existing-group',
              description: 'Existing group with fetch server',
            },
          ],
        })
      }),
      http.get('*/api/v1beta/workloads', () => {
        return HttpResponse.json({
          workloads: [
            {
              name: 'fetch', // Conflicts with a server in dev-toolkit
              group: 'my-existing-group', // Server exists in this specific group
              status: 'running',
            },
          ],
        })
      }),
      http.post('*/api/v1beta/groups', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        groupCalls.push({ name: body.name })
        return HttpResponse.json({ name: body.name })
      }),
      http.post('*/api/v1beta/workloads', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        workloadCalls.push({ name: body.name })
        return HttpResponse.json({
          name: body.name,
          status: 'running',
        })
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    // Wait for validation to complete and button to be disabled
    const installButton = screen.getByRole('button', { name: /install group/i })
    await waitFor(() => {
      expect(installButton).toBeDisabled()
    })

    // Verify error message is displayed mentioning the conflicting server
    expect(
      screen.getByText(/server.*"fetch".*already exists/i)
    ).toBeInTheDocument()

    // Verify "delete it" link points to the specific group where the server exists
    const deleteLink = screen.getByRole('link', { name: /delete it/i })
    expect(deleteLink).toBeInTheDocument()
    expect(deleteLink).toHaveAttribute('href', '/group/my-existing-group')

    // Verify NO API calls were made
    expect(groupCalls).toHaveLength(0)
    expect(workloadCalls).toHaveLength(0)

    // Verify wizard did not open (no server form dialogs)
    expect(
      screen.queryByRole('heading', { name: /configure/i })
    ).not.toBeInTheDocument()
  })

  it('shows error with link to first conflicting server group (fail fast pattern)', async () => {
    // Track API calls to verify NONE are made
    const groupCalls: Array<{ name: string }> = []
    const workloadCalls: Array<{ name: string }> = []

    // Override the mock to use a group with servers
    mockUseParams.mockReturnValue({ name: 'dev-toolkit' })

    // Create a custom registry with dev-toolkit group containing multiple servers
    const customRegistry: V1GetRegistryResponse = {
      registry: {
        servers: {},
        groups: [
          {
            name: 'dev-toolkit',
            description: 'Dev toolkit with multiple servers',
            servers: {
              fetch: {
                name: 'fetch',
                image: 'ghcr.io/example/fetch:latest',
                description: 'Fetch server',
                tier: 'Community',
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
              atlassian: {
                name: 'atlassian',
                image: 'ghcr.io/example/atlassian:latest',
                description: 'Atlassian server',
                tier: 'Community',
                status: 'Active',
                transport: 'stdio',
                permissions: {},
                tools: ['atlassian'],
                env_vars: [],
                args: [],
                metadata: {
                  stars: 200,
                  pulls: 2000,
                  last_updated: '2025-01-01T00:00:00Z',
                },
                repository_url: 'https://github.com/example/atlassian',
                tags: ['test'],
              },
            },
            remote_servers: {},
          },
        ],
      },
    }

    // Mock workloads API to return servers in DIFFERENT groups
    server.use(
      http.get('*/api/v1beta/registry/:name', () => {
        return HttpResponse.json(customRegistry)
      }),
      http.get('*/api/v1beta/workloads', () => {
        return HttpResponse.json({
          workloads: [
            {
              name: 'fetch',
              group: 'group-a', // Server exists in group-a
              status: 'running',
            },
            {
              name: 'atlassian',
              group: 'group-b', // Server exists in group-b (different group)
              status: 'running',
            },
          ],
        })
      }),
      http.post('*/api/v1beta/groups', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        groupCalls.push({ name: body.name })
        return HttpResponse.json({
          name: body.name,
        })
      }),
      http.post('*/api/v1beta/workloads', async ({ request }) => {
        const body = (await request.json()) as { name: string }
        workloadCalls.push({ name: body.name })
        return HttpResponse.json({
          name: body.name,
          status: 'running',
        })
      })
    )

    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    // Wait for validation to complete and button to be disabled
    const installButton = screen.getByRole('button', { name: /install group/i })
    await waitFor(() => {
      expect(installButton).toBeDisabled()
    })

    // Verify error message shows only the FIRST conflicting server (fail fast)
    // Even though both "fetch" and "atlassian" conflict, we only show "fetch"
    expect(
      screen.getByText(/server.*"fetch".*already exists/i)
    ).toBeInTheDocument()

    // Verify "delete it" link points to the group where "fetch" exists (group-a)
    const deleteLink = screen.getByRole('link', { name: /delete it/i })
    expect(deleteLink).toBeInTheDocument()
    expect(deleteLink).toHaveAttribute('href', '/group/group-a')

    // Verify NO API calls were made
    expect(groupCalls).toHaveLength(0)
    expect(workloadCalls).toHaveLength(0)

    // Verify wizard did not open (no server form dialogs)
    expect(
      screen.queryByRole('heading', { name: /configure/i })
    ).not.toBeInTheDocument()
  })

  it('allows configuring env vars and secrets during wizard flow', async () => {
    // Track workload API calls to verify env vars and secrets are included
    const workloadCalls: Array<{
      name: string
      env_vars?: Record<string, string>
      secrets?: Array<{ name: string; target: string }>
    }> = []

    // Override the mock to use a group with a server that has env vars and secrets
    mockUseParams.mockReturnValue({ name: 'config-test-group' })

    // Create a fixture with a server that has env_vars and secrets
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

    // Mock the APIs
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

    // Wait for page to load
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'config-test-group' })
      ).toBeVisible()
    })

    // Click "Install group" button
    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    // Wait for form to appear
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure config-server/i })
      ).toBeVisible()
    })

    // Verify env var field is present and configurable
    const apiEndpointInput = screen.getByLabelText(/API_ENDPOINT value/i)
    expect(apiEndpointInput).toBeVisible()
    expect(apiEndpointInput).toHaveValue('https://default.example.com')

    // Verify secret field is present and configurable
    const apiKeyInput = screen.getByLabelText(/API_KEY value/i)
    expect(apiKeyInput).toBeVisible()

    // Submit the form with default/filled values
    await userEvent.click(screen.getByRole('button', { name: /^finish$/i }))

    // Verify workload was created
    await waitFor(() => {
      expect(workloadCalls).toHaveLength(1)
    })

    // Verify env vars were included (verifies they can be configured)
    expect(workloadCalls[0]?.env_vars).toBeDefined()
    expect(workloadCalls[0]?.env_vars?.API_ENDPOINT).toBe(
      'https://default.example.com'
    )

    // Note: This test verifies that env vars and secrets fields are present
    // and can be configured during the wizard flow. The fields are rendered,
    // accessible, and their values are submitted with the workload.
  })

  it('allows configuring network isolation during wizard flow', async () => {
    // Track workload API calls to verify network isolation settings
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

    // Override the mock to use a group with a server that has network permissions
    mockUseParams.mockReturnValue({ name: 'network-test-group' })

    // Create a fixture with a server that has network permissions
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

    // Mock the APIs
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

    // Wait for page to load
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'network-test-group' })
      ).toBeVisible()
    })

    // Click "Install group" button
    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    // Wait for form to appear
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure network-server/i })
      ).toBeVisible()
    })

    // Navigate to Network Isolation tab
    const networkIsolationTab = screen.getByRole('tab', {
      name: /network isolation/i,
    })
    await userEvent.click(networkIsolationTab)

    // Verify network isolation fields are present
    await waitFor(() => {
      expect(
        screen.getByText(/enable outbound network filtering/i)
      ).toBeInTheDocument()
    })

    // Submit the form (network isolation settings from registry should be used)
    await userEvent.click(screen.getByRole('button', { name: /^finish$/i }))

    // Verify workload was created
    await waitFor(() => {
      expect(workloadCalls).toHaveLength(1)
    })

    // Note: This test verifies that network isolation tab and fields are present
    // and accessible during the wizard flow, allowing users to configure
    // network isolation settings for servers.
  })

  it('allows configuring storage volumes during wizard flow', async () => {
    // Track workload API calls to verify volume configuration
    const workloadCalls: Array<{
      name: string
      volumes?: Array<{ host: string; container: string; mode?: string }>
    }> = []

    // Override the mock to use a group with a server
    mockUseParams.mockReturnValue({ name: 'volume-test-group' })

    // Create a fixture with a server (volumes can be configured for any server)
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

    // Mock the APIs
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

    // Wait for page to load
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'volume-test-group' })
      ).toBeVisible()
    })

    // Click "Install group" button
    const installButton = screen.getByRole('button', { name: /install group/i })
    await userEvent.click(installButton)

    // Wait for form to appear
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure volume-server/i })
      ).toBeVisible()
    })

    // Verify storage volumes section is present (it's on the Configuration tab)
    await waitFor(() => {
      expect(screen.getByText(/storage volumes/i)).toBeInTheDocument()
    })

    // Submit the form
    await userEvent.click(screen.getByRole('button', { name: /^finish$/i }))

    // Verify workload was created
    await waitFor(() => {
      expect(workloadCalls).toHaveLength(1)
    })

    // Note: This test verifies that storage volumes fields are present
    // and accessible during the wizard flow, allowing users to configure
    // volume mounts for servers.
  })
})
