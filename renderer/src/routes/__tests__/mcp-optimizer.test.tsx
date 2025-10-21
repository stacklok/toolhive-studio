import { screen, waitFor } from '@testing-library/react'
import { beforeEach, it, expect, vi } from 'vitest'
import { createTestRouter } from '@/common/test/create-test-router'
import { McpOptimizerRoute } from '../mcp-optimizer'
import { renderRoute } from '@/common/test/render-route'
import { server, recordRequests } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'
import userEvent from '@testing-library/user-event'

const router = createTestRouter(McpOptimizerRoute, '/mcp-optimizer')

beforeEach(() => {
  vi.clearAllMocks()

  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads'), () =>
      HttpResponse.json({
        workloads: [
          { name: 'server1', group: 'default' },
          { name: 'server2', group: 'default' },
          { name: 'server3', group: 'production' },
        ],
      })
    )
  )
})

it('renders the MCP Optimizer page title', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('heading', { name: /mcp optimizer/i })
    ).toBeInTheDocument()
  })
})

it('renders the Advanced dropdown menu button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /advanced/i })
    ).toBeInTheDocument()
  })
})

it('renders the Manage Clients button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /manage clients/i })
    ).toBeInTheDocument()
  })
})

it('renders the warnings section', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('Experimental Feature')).toBeInTheDocument()
  })

  expect(screen.getByText('Unoptimized Access Detected')).toBeInTheDocument()
})

it('renders the section header and description', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('Select Groups to Optimize')).toBeInTheDocument()
  })

  expect(
    screen.getByText(
      /Choose which server groups should be included in optimization/i
    )
  ).toBeInTheDocument()
})

it('renders the group selector form with groups', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getAllByText('default').length).toBeGreaterThan(0)
  })

  expect(screen.getAllByText('production').length).toBeGreaterThan(0)
})

it('renders the Apply Changes button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /apply changes/i })
    ).toBeInTheDocument()
  })
})

it('displays server names for each group', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('server1, server2')).toBeInTheDocument()
  })

  expect(screen.getByText('server3')).toBeInTheDocument()
})

it('hides the mcp-optimizer group even when present in fixture data', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [
          { name: 'default' },
          { name: MCP_OPTIMIZER_GROUP_NAME },
          { name: 'production' },
        ],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads'), () =>
      HttpResponse.json({
        workloads: [
          { name: 'server1', group: 'default' },
          { name: 'meta-mcp', group: MCP_OPTIMIZER_GROUP_NAME },
          { name: 'server3', group: 'production' },
        ],
      })
    )
  )

  renderRoute(router)

  await waitFor(() => {
    expect(screen.getAllByText('default').length).toBeGreaterThan(0)
    expect(screen.getAllByText('production').length).toBeGreaterThan(0)
  })

  expect(screen.queryByText(MCP_OPTIMIZER_GROUP_NAME)).not.toBeInTheDocument()
})

it('Manage Clients button is correctly prefilled for the mcp-optimizer group', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [
          {
            name: MCP_OPTIMIZER_GROUP_NAME,
            registered_clients: ['vscode', 'cursor'],
          },
        ],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/clients'), () =>
      HttpResponse.json([
        { name: { name: 'vscode' }, groups: [MCP_OPTIMIZER_GROUP_NAME] },
        { name: { name: 'cursor' }, groups: [MCP_OPTIMIZER_GROUP_NAME] },
        { name: { name: 'claude-code' }, groups: [] },
      ])
    )
  )

  const user = userEvent.setup()
  renderRoute(router)

  await user.click(
    await screen.findByRole('button', { name: /manage clients/i })
  )

  await waitFor(() => {
    const vscodeSwitchContainer = screen
      .getByRole('switch', { name: 'vscode' })
      .closest('button')
    expect(vscodeSwitchContainer).toHaveAttribute('data-state', 'checked')

    const cursorSwitchContainer = screen
      .getByRole('switch', { name: /cursor/i })
      .closest('button')
    expect(cursorSwitchContainer).toHaveAttribute('data-state', 'checked')

    const claudeCodeSwitchContainer = screen
      .getByRole('switch', { name: /claude-code/i })
      .closest('button')
    expect(claudeCodeSwitchContainer).toHaveAttribute('data-state', 'unchecked')
  })
})

it('Manage Clients button sends API requests to the correct mcp-optimizer group', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: MCP_OPTIMIZER_GROUP_NAME, registered_clients: [] }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/clients'), () => HttpResponse.json([]))
  )

  const rec = recordRequests()

  const user = userEvent.setup()
  renderRoute(router)

  await user.click(
    await screen.findByRole('button', { name: /manage clients/i })
  )
  await user.click(await screen.findByRole('switch', { name: 'vscode' }))
  await user.click(await screen.findByRole('button', { name: /save/i }))

  await waitFor(() =>
    expect(
      rec.recordedRequests.filter(
        (r) =>
          r.pathname.startsWith('/api/v1beta/clients') &&
          (r.method === 'POST' || r.method === 'DELETE')
      )
    ).toHaveLength(1)
  )

  const snapshot = rec.recordedRequests
    .filter(
      (r) =>
        r.pathname.startsWith('/api/v1beta/clients') &&
        (r.method === 'POST' || r.method === 'DELETE')
    )
    .map(({ method, pathname, payload }) => ({
      method,
      path: pathname,
      body: payload,
    }))

  expect(snapshot).toEqual([
    {
      method: 'POST',
      path: '/api/v1beta/clients',
      body: { name: 'vscode', groups: [MCP_OPTIMIZER_GROUP_NAME] },
    },
  ])
})
