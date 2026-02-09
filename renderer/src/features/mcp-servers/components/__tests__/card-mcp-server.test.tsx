import { screen, waitFor } from '@testing-library/react'
import { expect, it, describe, beforeEach } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import userEvent from '@testing-library/user-event'
import { recordRequests } from '@/common/mocks/node'
import { HttpResponse } from 'msw'
import { mockedPostApiV1BetaWorkloads } from '@/common/mocks/fixtures/workloads/post'
import { mockedGetApiV1BetaWorkloadsByName } from '@mocks/fixtures/workloads_name/get'
import { mockedGetApiV1BetaRegistryByNameServers } from '@mocks/fixtures/registry_name_servers/get'
import {
  createRootRoute,
  createRoute,
  Outlet,
  Router,
} from '@tanstack/react-router'
import { createMemoryHistory } from '@tanstack/react-router'
import { CardMcpServer } from '../card-mcp-server/index'
import { EditServerDialogProvider } from '../../contexts/edit-server-dialog-provider'

function createCardMcpServerTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })

  const groupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/group/$groupName',
    component: () => (
      <EditServerDialogProvider>
        <CardMcpServer
          name="postgres-db"
          status="running"
          statusContext={undefined}
          url="http://localhost:8080"
          transport="streamable-http"
          group="default"
        />
      </EditServerDialogProvider>
    ),
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([groupRoute]),
    history: createMemoryHistory({ initialEntries: ['/group/default'] }),
  })

  return router
}

const router = createCardMcpServerTestRouter() as unknown as ReturnType<
  typeof createTestRouter
>

beforeEach(() => {
  router.navigate({ to: '/group/$groupName', params: { groupName: 'default' } })
})

it('navigates to logs page when logs menu item is clicked', async () => {
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const user = userEvent.setup()
  const menuButton = screen.getByRole('button', { name: /more/i })
  await user.click(menuButton)

  const logsMenuItem = screen.getByRole('menuitem', { name: /logs/i })
  await user.click(logsMenuItem)

  await waitFor(() => {
    expect(router.state.location.pathname).toBe('/logs/default/postgres-db')
  })
})

it('shows "Copy server to a group" menu item and handles the complete workflow', async () => {
  const rec = recordRequests()
  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const user = userEvent.setup()

  const dropdownTrigger = screen.getByRole('button', {
    name: /more options/i,
  })
  await user.click(dropdownTrigger)

  const addToGroupMenuItem = screen.queryByRole('menuitem', {
    name: /copy server to a group/i,
  })
  expect(addToGroupMenuItem).toBeInTheDocument()

  await user.click(addToGroupMenuItem!)

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Copy server to a group')).toBeVisible()
    expect(screen.getByText('Select destination group')).toBeVisible()
  })

  const selectTrigger = screen.getByRole('combobox')
  await user.click(selectTrigger)

  const groupOption = screen.getByRole('option', { name: 'default' })
  await user.click(groupOption)

  const submitButton = screen.getByRole('button', { name: 'OK' })
  await user.click(submitButton)

  await waitFor(() => {
    expect(
      screen.queryByText('Select destination group')
    ).not.toBeInTheDocument()
  })

  await waitFor(() => {
    const createCall = rec.recordedRequests.find(
      (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
    )
    expect(createCall).toBeDefined()
    expect(createCall?.payload).toMatchInlineSnapshot(`
      {
        "cmd_arguments": [],
        "env_vars": {},
        "group": "default",
        "host": "127.0.0.1",
        "image": "ghcr.io/postgres/postgres-mcp-server:latest",
        "name": "postgres-db-default",
        "network_isolation": false,
        "secrets": [],
        "target_port": 28135,
        "transport": "stdio",
        "volumes": [],
      }
    `)
  })
})

it('shows validation error and re-prompts when API returns 409 conflict', async () => {
  const rec = recordRequests()
  let attemptCount = 0

  mockedPostApiV1BetaWorkloads.overrideHandler(() => {
    attemptCount++

    // First two attempts return 409 conflict (plain text, like real API)
    if (attemptCount <= 2) {
      return new HttpResponse('Workload with name already exists', {
        status: 409,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    }

    // Third attempt succeeds
    return HttpResponse.json({ name: 'postgres-db-final' })
  })

  renderRoute(router)

  await waitFor(() => {
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  const user = userEvent.setup()

  const dropdownTrigger = screen.getByRole('button', {
    name: /more options/i,
  })
  await user.click(dropdownTrigger)

  const copyMenuItem = screen.getByRole('menuitem', {
    name: /copy server to a group/i,
  })
  await user.click(copyMenuItem)

  await waitFor(() => {
    expect(screen.getByText('Copy server to a group')).toBeVisible()
  })

  const selectTrigger = screen.getByRole('combobox')
  await user.click(selectTrigger)

  const groupOption = screen.getByRole('option', { name: 'my group' })
  await user.click(groupOption)

  const submitButton = screen.getByRole('button', { name: 'OK' })
  await user.click(submitButton)

  await waitFor(() => {
    expect(
      screen.queryByText('Select destination group')
    ).not.toBeInTheDocument()
  })

  await waitFor(() => {
    expect(screen.getByText('Copy server to a group')).toBeVisible()
    const nameInput = screen.getByLabelText('Name')
    expect(nameInput).toBeVisible()
    expect(nameInput).toHaveValue('postgres-db-my-group')
  })

  let nameInput = screen.getByLabelText('Name')

  let confirmButton = screen.getByRole('button', { name: /ok|confirm/i })
  await user.click(confirmButton)

  await waitFor(() => {
    expect(screen.getByText(/This name is already taken/i)).toBeVisible()
  })

  nameInput = screen.getByDisplayValue('postgres-db-my-group')
  expect(nameInput).toBeVisible()
  expect(nameInput).toHaveValue('postgres-db-my-group')

  await user.clear(nameInput)
  await user.type(nameInput, 'postgres-db-attempt2')

  confirmButton = screen.getByRole('button', { name: /ok|confirm/i })
  await user.click(confirmButton)

  await waitFor(() => {
    expect(screen.getByText(/This name is already taken/i)).toBeVisible()
  })

  nameInput = screen.getByDisplayValue('postgres-db-attempt2')
  await user.clear(nameInput)
  await user.type(nameInput, 'postgres-db-final')

  confirmButton = screen.getByRole('button', { name: /ok|confirm/i })
  await user.click(confirmButton)

  await waitFor(() => {
    expect(screen.queryByText('Copy server to a group')).not.toBeInTheDocument()
  })

  const createCalls = rec.recordedRequests.filter(
    (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
  )
  expect(createCalls).toHaveLength(3)
  expect(createCalls.map((c) => (c.payload as { name: string }).name)).toEqual([
    'postgres-db-my-group',
    'postgres-db-attempt2',
    'postgres-db-final',
  ])
})

it('stays on the same group page after deleting a server', async () => {
  // this verifies that a bug reported here is fixed:
  // https://github.com/stacklok/toolhive-studio/issues/904
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })

  const groupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/group/$groupName',
    component: () => (
      <EditServerDialogProvider>
        <CardMcpServer
          name="fetch1"
          status="running"
          statusContext={undefined}
          url="http://localhost:8080"
          transport="streamable-http"
          group="g1"
        />
      </EditServerDialogProvider>
    ),
  })

  const testRouter = new Router({
    routeTree: rootRoute.addChildren([groupRoute]),
    history: createMemoryHistory({ initialEntries: ['/group/g1'] }),
  }) as unknown as ReturnType<typeof createTestRouter>

  renderRoute(testRouter)

  await waitFor(() => {
    expect(screen.getByText('fetch1')).toBeVisible()
  })

  const user = userEvent.setup()
  const menuButton = screen.getByRole('button', { name: /more/i })
  await user.click(menuButton)

  const removeMenuItem = screen.getByRole('menuitem', { name: /remove/i })
  await user.click(removeMenuItem)

  await waitFor(() => {
    const pathname = testRouter.state.location.pathname
    expect(pathname).toBe('/group/g1')
  })
})

describe('version drift', () => {
  function createDriftRouter() {
    const rootRoute = createRootRoute({
      component: Outlet,
      errorComponent: ({ error }) => <div>{error.message}</div>,
    })

    const groupRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/group/$groupName',
      component: () => (
        <EditServerDialogProvider>
          <CardMcpServer
            name="postgres-db"
            status="running"
            statusContext={undefined}
            url="http://localhost:8080"
            transport="stdio"
            group="default"
          />
        </EditServerDialogProvider>
      ),
    })

    return new Router({
      routeTree: rootRoute.addChildren([groupRoute]),
      history: createMemoryHistory({ initialEntries: ['/group/default'] }),
    }) as unknown as ReturnType<typeof createTestRouter>
  }

  it('shows update icon button on card when tag drift is detected', async () => {
    mockedGetApiV1BetaWorkloadsByName.override((data) => ({
      ...data,
      name: 'postgres-db',
      image: 'ghcr.io/postgres/postgres-mcp-server:v1.0.0',
    }))
    mockedGetApiV1BetaRegistryByNameServers.override(() => ({
      servers: [
        {
          name: 'postgres',
          image: 'ghcr.io/postgres/postgres-mcp-server:v2.0.0',
          description: 'Postgres MCP server',
          transport: 'stdio',
          tools: ['query', 'execute'],
          env_vars: [],
          args: [],
        },
      ],
      remote_servers: [],
    }))

    const driftRouter = createDriftRouter()
    renderRoute(driftRouter)

    await waitFor(() => {
      expect(screen.getByText('postgres-db')).toBeVisible()
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Update to v2.0.0' })
      ).toBeVisible()
    })
  })

  it('shows "Update to" menu item in dropdown when tag drift is detected', async () => {
    mockedGetApiV1BetaWorkloadsByName.override((data) => ({
      ...data,
      name: 'postgres-db',
      image: 'ghcr.io/postgres/postgres-mcp-server:v1.0.0',
    }))
    mockedGetApiV1BetaRegistryByNameServers.override(() => ({
      servers: [
        {
          name: 'postgres',
          image: 'ghcr.io/postgres/postgres-mcp-server:v2.0.0',
          description: 'Postgres MCP server',
          transport: 'stdio',
          tools: ['query', 'execute'],
          env_vars: [],
          args: [],
        },
      ],
      remote_servers: [],
    }))

    const driftRouter = createDriftRouter()
    renderRoute(driftRouter)

    await waitFor(() => {
      expect(screen.getByText('postgres-db')).toBeVisible()
    })

    const user = userEvent.setup()
    const menuButton = screen.getByRole('button', { name: /more options/i })
    await user.click(menuButton)

    await waitFor(() => {
      expect(
        screen.getByRole('menuitem', { name: /update to v2\.0\.0/i })
      ).toBeVisible()
    })
  })

  it('does not show update icon when there is no tag drift', async () => {
    mockedGetApiV1BetaWorkloadsByName.override((data) => ({
      ...data,
      name: 'postgres-db',
      image: 'ghcr.io/postgres/postgres-mcp-server:v1.0.0',
    }))
    mockedGetApiV1BetaRegistryByNameServers.override(() => ({
      servers: [
        {
          name: 'postgres',
          image: 'ghcr.io/postgres/postgres-mcp-server:v1.0.0',
          description: 'Postgres MCP server',
          transport: 'stdio',
          tools: ['query', 'execute'],
          env_vars: [],
          args: [],
        },
      ],
      remote_servers: [],
    }))

    const driftRouter = createDriftRouter()
    renderRoute(driftRouter)

    await waitFor(() => {
      expect(screen.getByText('postgres-db')).toBeVisible()
    })

    // Give time for registry data to load, then assert no update button
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /update to/i })
      ).not.toBeInTheDocument()
    })
  })

  it('does not show update icon when server is not from registry', async () => {
    // Default workload has an image that doesn't match registry
    const driftRouter = createDriftRouter()
    renderRoute(driftRouter)

    await waitFor(() => {
      expect(screen.getByText('postgres-db')).toBeVisible()
    })

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /update to/i })
      ).not.toBeInTheDocument()
    })
  })

  it('triggers update flow from the update icon button', async () => {
    const rec = recordRequests()

    mockedGetApiV1BetaWorkloadsByName.override((data) => ({
      ...data,
      name: 'postgres-db',
      image: 'ghcr.io/postgres/postgres-mcp-server:v1.0.0',
      transport: 'stdio',
      group: 'default',
    }))
    mockedGetApiV1BetaRegistryByNameServers.override(() => ({
      servers: [
        {
          name: 'postgres',
          image: 'ghcr.io/postgres/postgres-mcp-server:v2.0.0',
          description: 'Postgres MCP server',
          transport: 'stdio',
          tools: ['query', 'execute'],
          env_vars: [],
          args: [],
        },
      ],
      remote_servers: [],
    }))

    const driftRouter = createDriftRouter()
    renderRoute(driftRouter)

    const user = userEvent.setup()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Update to v2.0.0' })
      ).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: 'Update to v2.0.0' }))

    // Confirm the update dialog appears
    await waitFor(() => {
      expect(screen.getByText('Update to latest version')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Update' })).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: 'Update' }))

    await waitFor(() => {
      const editRequest = rec.recordedRequests.find(
        (r) =>
          r.method === 'POST' &&
          r.pathname === '/api/v1beta/workloads/postgres-db/edit'
      )
      expect(editRequest).toBeDefined()
      expect(editRequest?.payload).toMatchObject({
        image: 'ghcr.io/postgres/postgres-mcp-server:v2.0.0',
      })
      expect(editRequest?.payload).not.toHaveProperty('name')
    })
  })
})
