import { screen, waitFor } from '@testing-library/react'
import { beforeEach, it, expect, vi } from 'vitest'
import { createTestRouter } from '@/common/test/create-test-router'
import { McpOptimizerRoute } from '../mcp-optimizer'
import { renderRoute } from '@/common/test/render-route'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
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

it('renders the warnings section', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('Experimental Feature')).toBeInTheDocument()
  })
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

it('preselects the default group when meta-mcp ALLOWED_GROUPS is set to default', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: { ALLOWED_GROUPS: 'default' },
        })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).toBeChecked()

    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).not.toBeChecked()
  })
})

it('preselects the production group when meta-mcp ALLOWED_GROUPS is set to production', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: { ALLOWED_GROUPS: 'production' },
        })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  renderRoute(router)

  await waitFor(() => {
    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).toBeChecked()

    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()
  })
})

it('shows no group selected when meta-mcp ALLOWED_GROUPS is not set', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: {},
        })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()

    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).not.toBeChecked()
  })
})

it('shows no group selected when meta-mcp ALLOWED_GROUPS contains multiple groups', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: { ALLOWED_GROUPS: 'default,production' },
        })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()

    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).not.toBeChecked()
  })
})

it('shows no group selected when meta-mcp workload does not exist', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        return HttpResponse.json(null, { status: 404 })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()

    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).not.toBeChecked()
  })
})

it('refetches the selected group when navigating back to the page', async () => {
  let callCount = 0

  server.use(
    http.get(mswEndpoint('/api/v1beta/groups'), () =>
      HttpResponse.json({
        groups: [{ name: 'default' }, { name: 'production' }],
      })
    ),
    http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
      if (params.name === META_MCP_SERVER_NAME) {
        callCount++
        const allowedGroups = callCount === 1 ? 'default' : 'production'
        return HttpResponse.json({
          name: META_MCP_SERVER_NAME,
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: { ALLOWED_GROUPS: allowedGroups },
        })
      }
      return HttpResponse.json(null, { status: 404 })
    })
  )

  const { unmount } = renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).toBeChecked()
  })

  expect(callCount).toBe(1)

  unmount()

  renderRoute(router)

  await waitFor(() => {
    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).toBeChecked()

    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()
  })

  expect(callCount).toBe(2)
})

it('clicking Meta-MCP logs in Advanced menu navigates to logs page', async () => {
  const user = userEvent.setup()
  renderRoute(router)

  // Open the Advanced dropdown menu
  const advancedButton = await screen.findByRole('button', {
    name: /advanced/i,
  })
  await user.click(advancedButton)

  // Click on the "Meta-MCP logs" menu item
  const logsMenuItem = await screen.findByText(/mcp optimizer logs/i)
  await user.click(logsMenuItem)

  // Verify navigation to the logs page with correct parameters
  await waitFor(() => {
    expect(router.state.location.pathname).toBe(
      `/logs/${MCP_OPTIMIZER_GROUP_NAME}/${META_MCP_SERVER_NAME}`
    )
  })
})
