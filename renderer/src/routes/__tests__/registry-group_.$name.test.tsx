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

  it('matches column headers snapshot', async () => {
    const router = createTestRouter(WrapperComponent)
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'dev-toolkit' })).toBeVisible()
    })

    const table = screen.getByRole('table')
    const headerCells = within(table).getAllByRole('columnheader')
    const headers = headerCells.map((th) => th.textContent?.trim() || '')
    expect(headers).toEqual(['Server', 'Description'])
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

  it('shows Next button in wizard and navigates to second server on click', async () => {
    // Override the mock to use a group with multiple servers
    mockUseParams.mockReturnValue({ name: 'multi-server-group' })

    // Create a fixture with a group containing 2 servers
    const multiServerRegistry: V1GetRegistryResponse = {
      registry: {
        servers: {},
        groups: [
          {
            name: 'multi-server-group',
            description: 'A group with multiple servers',
            servers: {
              'server-one': {
                name: 'server-one',
                image: 'ghcr.io/example/server-one:latest',
                description: 'First server in the group',
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
                repository_url: 'https://github.com/example/server-one',
                tags: ['test'],
              },
              'server-two': {
                name: 'server-two',
                image: 'ghcr.io/example/server-two:latest',
                description: 'Second server in the group',
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
                repository_url: 'https://github.com/example/server-two',
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
        screen.getByRole('heading', { name: /configure server-one/i })
      ).toBeVisible()
    })

    // Look for the "Next" button (should exist when there are more servers)
    const nextButton = screen.getByRole('button', { name: /next/i })
    expect(nextButton).toBeVisible()

    // Click the Next button
    await userEvent.click(nextButton)

    // Verify we moved to the second server's form
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /configure server-two/i })
      ).toBeVisible()
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
})
