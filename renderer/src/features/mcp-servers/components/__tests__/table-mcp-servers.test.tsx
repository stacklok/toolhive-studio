import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
} from '@tanstack/react-router'
import { renderRoute } from '@/common/test/render-route'
import type { createTestRouter } from '@/common/test/create-test-router'
import { mockedGetApiV1BetaWorkloadsByName } from '@mocks/fixtures/workloads_name/get'
import { mockedGetApiV1BetaRegistryByNameServers } from '@mocks/fixtures/registry_name_servers/get'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import { TableMcpServers } from '../table-mcp-servers'
import { EditServerDialogProvider } from '../../contexts/edit-server-dialog-provider'

function makeRouter(servers: CoreWorkload[]) {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })

  const groupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/group/$groupName',
    component: () => (
      <EditServerDialogProvider>
        <TableMcpServers mcpServers={servers} />
      </EditServerDialogProvider>
    ),
  })

  return new Router({
    routeTree: rootRoute.addChildren([groupRoute]),
    history: createMemoryHistory({ initialEntries: ['/group/default'] }),
    defaultNotFoundComponent: () => null,
  }) as unknown as ReturnType<typeof createTestRouter>
}

const baseServer: CoreWorkload = {
  name: 'postgres-db',
  status: 'running',
  package: 'ghcr.io/postgres/postgres-mcp-server:v1.0.0',
  transport_type: 'stdio',
  group: 'default',
  url: 'http://localhost:8080',
  remote: false,
}

describe('TableMcpServers', () => {
  beforeEach(() => {
    mockedGetApiV1BetaRegistryByNameServers.override(() => ({
      servers: [],
      remote_servers: [],
    }))
  })

  it('renders a header row and one row per server', async () => {
    const router = makeRouter([
      baseServer,
      { ...baseServer, name: 'sequentialthinking', status: 'stopped' },
    ])
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('postgres-db')).toBeVisible()
    })

    expect(
      screen.getByRole('columnheader', { name: /server/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /about/i })
    ).toBeInTheDocument()
    expect(screen.getByText('sequentialthinking')).toBeVisible()
  })

  it('renders the status text and a toggle switch per row', async () => {
    const router = makeRouter([baseServer])
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('postgres-db')).toBeVisible()
    })

    expect(screen.getByText(/running/i)).toBeVisible()
    expect(screen.getByRole('switch', { name: /mutate server/i })).toBeChecked()
  })

  it('exposes the full server actions dropdown on each row', async () => {
    const router = makeRouter([baseServer])
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('postgres-db')).toBeVisible()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /more options/i }))

    expect(
      screen.getByRole('menuitem', { name: /edit configuration/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /logs/i })).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /remove/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /copy server to a group/i })
    ).toBeInTheDocument()
  })

  it('renders the update-version button when registry drift is detected', async () => {
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

    const router = makeRouter([baseServer])
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /update to v2\.0\.0/i })
      ).toBeVisible()
    })
  })

  it('shows the registry description in the About column when available', async () => {
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
          description: 'Connects AI assistants to PostgreSQL databases.',
          transport: 'stdio',
          tools: ['query'],
          env_vars: [],
          args: [],
        },
      ],
      remote_servers: [],
    }))

    const router = makeRouter([baseServer])
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByText(/connects ai assistants to postgresql databases\./i)
      ).toBeVisible()
    })
  })
})
