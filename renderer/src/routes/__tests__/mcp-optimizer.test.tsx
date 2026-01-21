import { screen, waitFor } from '@testing-library/react'
import { beforeEach, it, expect, vi } from 'vitest'
import { createTestRouter } from '@/common/test/create-test-router'
import { McpOptimizerRoute } from '../mcp-optimizer'
import { renderRoute } from '@/common/test/render-route'
import { recordRequests } from '@/common/mocks/node'
import { HttpResponse } from 'msw'
import { mockedGetApiV1BetaGroups } from '@/common/mocks/fixtures/groups/get'
import { mockedGetApiV1BetaWorkloads } from '@/common/mocks/fixtures/workloads/get'
import { mockedGetApiV1BetaWorkloadsByName } from '@/common/mocks/fixtures/workloads_name/get'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import userEvent from '@testing-library/user-event'

const router = createTestRouter(McpOptimizerRoute, '/mcp-optimizer')

beforeEach(() => {
  vi.clearAllMocks()

  mockedGetApiV1BetaGroups.override((data) => {
    const [first, second] = data.groups ?? []
    if (!first || !second) {
      return data
    }
    return {
      ...data,
      groups: [
        { ...first, name: 'default' },
        { ...second, name: 'production' },
      ],
    }
  })

  mockedGetApiV1BetaWorkloads.override((data) => {
    const [first, second, third] = data.workloads ?? []
    if (!first || !second || !third) {
      return data
    }
    return {
      ...data,
      workloads: [
        { ...first, name: 'server1', group: 'default', status: 'running' },
        { ...second, name: 'server2', group: 'default', status: 'running' },
        { ...third, name: 'server3', group: 'production', status: 'running' },
      ],
    }
  })
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
  mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
    ({ path }) => path?.name === META_MCP_SERVER_NAME,
    (data) => ({
      ...data,
      name: META_MCP_SERVER_NAME,
      group: MCP_OPTIMIZER_GROUP_NAME,
      env_vars: { ALLOWED_GROUPS: 'default' },
    })
  )

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
    expect(screen.getByText('Select Group to Optimize')).toBeInTheDocument()
  })

  expect(
    screen.getByText(/Choose which server group to optimize/i)
  ).toBeInTheDocument()
})

it('renders the group selector form with groups', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getAllByText('default').length).toBeGreaterThan(0)
  })

  expect(screen.getAllByText('production').length).toBeGreaterThan(0)
})

it('renders the Set Optimized Group button', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /set optimized group/i })
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

it('only displays running servers and filters out stopped ones', async () => {
  mockedGetApiV1BetaWorkloads.override((data) => {
    const [first, second, third, fourth] = data.workloads ?? []
    if (!first || !second || !third || !fourth) {
      return data
    }
    return {
      ...data,
      workloads: [
        { ...first, name: 'server1', group: 'default', status: 'running' },
        { ...second, name: 'server2', group: 'default', status: 'stopped' },
        { ...third, name: 'server3', group: 'production', status: 'running' },
        { ...fourth, name: 'server4', group: 'production', status: 'exited' },
      ],
    }
  })

  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('server1')).toBeInTheDocument()
  })

  expect(screen.getByText('server3')).toBeInTheDocument()
  expect(screen.queryByText('server2')).not.toBeInTheDocument()
  expect(screen.queryByText('server4')).not.toBeInTheDocument()
})

it('hides the mcp-optimizer group even when present in fixture data', async () => {
  mockedGetApiV1BetaGroups.override((data) => {
    const [first, second, third] = data.groups ?? []
    if (!first || !second || !third) {
      return data
    }
    return {
      ...data,
      groups: [
        { ...first, name: 'default' },
        { ...second, name: MCP_OPTIMIZER_GROUP_NAME },
        { ...third, name: 'production' },
      ],
    }
  })

  mockedGetApiV1BetaWorkloads.override((data) => {
    const [first, second, third] = data.workloads ?? []
    if (!first || !second || !third) {
      return data
    }
    return {
      ...data,
      workloads: [
        { ...first, name: 'server1', group: 'default', status: 'running' },
        {
          ...second,
          name: 'meta-mcp',
          group: MCP_OPTIMIZER_GROUP_NAME,
          status: 'running',
        },
        { ...third, name: 'server3', group: 'production', status: 'running' },
      ],
    }
  })

  renderRoute(router)

  await waitFor(() => {
    expect(screen.getAllByText('default').length).toBeGreaterThan(0)
    expect(screen.getAllByText('production').length).toBeGreaterThan(0)
  })

  expect(screen.queryByText(MCP_OPTIMIZER_GROUP_NAME)).not.toBeInTheDocument()
})

it('preselects the default group when meta-mcp ALLOWED_GROUPS is set to default', async () => {
  mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
    ({ path }) => path?.name === META_MCP_SERVER_NAME,
    (data) => ({
      ...data,
      name: META_MCP_SERVER_NAME,
      group: MCP_OPTIMIZER_GROUP_NAME,
      env_vars: { ALLOWED_GROUPS: 'default' },
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
  mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
    ({ path }) => path?.name === META_MCP_SERVER_NAME,
    (data) => ({
      ...data,
      name: META_MCP_SERVER_NAME,
      group: MCP_OPTIMIZER_GROUP_NAME,
      env_vars: { ALLOWED_GROUPS: 'production' },
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
  mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
    ({ path }) => path?.name === META_MCP_SERVER_NAME,
    (data) => ({
      ...data,
      name: META_MCP_SERVER_NAME,
      group: MCP_OPTIMIZER_GROUP_NAME,
      env_vars: {},
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
  mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
    ({ path }) => path?.name === META_MCP_SERVER_NAME,
    (data) => ({
      ...data,
      name: META_MCP_SERVER_NAME,
      group: MCP_OPTIMIZER_GROUP_NAME,
      env_vars: { ALLOWED_GROUPS: 'default,production' },
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
  mockedGetApiV1BetaWorkloadsByName.overrideHandler((data, info) => {
    const name = info.params?.name
    if (name === META_MCP_SERVER_NAME) {
      return HttpResponse.json(null, { status: 404 })
    }
    return HttpResponse.json(data)
  })

  renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()

    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).not.toBeChecked()
  })
})

it('refetches the selected group when navigating back to the page', async () => {
  const rec = recordRequests()
  let callCount = 0

  mockedGetApiV1BetaWorkloadsByName.overrideHandler((data, info) => {
    const name = info.params?.name
    if (name === META_MCP_SERVER_NAME) {
      callCount++
      const allowedGroups = callCount === 1 ? 'default' : 'production'
      return HttpResponse.json({
        ...data,
        name: META_MCP_SERVER_NAME,
        group: MCP_OPTIMIZER_GROUP_NAME,
        env_vars: { ALLOWED_GROUPS: allowedGroups },
      })
    }
    return HttpResponse.json(data)
  })

  const metaMcpCalls = () =>
    rec.recordedRequests.filter(
      (r) =>
        r.method === 'GET' &&
        r.pathname === `/api/v1beta/workloads/${META_MCP_SERVER_NAME}`
    )

  const { unmount } = renderRoute(router)

  await waitFor(() => {
    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).toBeChecked()
  })

  expect(metaMcpCalls()).toHaveLength(1)

  unmount()

  renderRoute(router)

  await waitFor(() => {
    const productionRadio = screen.getByRole('radio', { name: /production/i })
    expect(productionRadio).toBeChecked()

    const defaultRadio = screen.getByRole('radio', { name: /default/i })
    expect(defaultRadio).not.toBeChecked()
  })

  expect(metaMcpCalls()).toHaveLength(2)
})

it('clicking Meta-MCP logs in Advanced menu navigates to logs page', async () => {
  mockedGetApiV1BetaWorkloadsByName.conditionalOverride(
    ({ path }) => path?.name === META_MCP_SERVER_NAME,
    (data) => ({
      ...data,
      name: META_MCP_SERVER_NAME,
      group: MCP_OPTIMIZER_GROUP_NAME,
      env_vars: { ALLOWED_GROUPS: 'default' },
    })
  )

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
