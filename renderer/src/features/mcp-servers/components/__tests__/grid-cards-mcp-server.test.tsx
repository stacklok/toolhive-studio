import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
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
import { mockedGetApiV1BetaRegistryByNameServers } from '@mocks/fixtures/registry_name_servers/get'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import { GridCardsMcpServers } from '../grid-cards-mcp-server'

const baseServer: CoreWorkload = {
  name: 'postgres-db',
  status: 'running',
  package: 'ghcr.io/postgres/postgres-mcp-server:v1.0.0',
  transport_type: 'stdio',
  group: 'default',
  url: 'http://localhost:8080',
  remote: false,
}

function makeRouter(servers: CoreWorkload[]) {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })

  const groupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/group/$groupName',
    component: () => <GridCardsMcpServers mcpServers={servers} />,
  })

  return new Router({
    routeTree: rootRoute.addChildren([groupRoute]),
    history: createMemoryHistory({ initialEntries: ['/group/default'] }),
    defaultNotFoundComponent: () => null,
  }) as unknown as ReturnType<typeof createTestRouter>
}

describe('GridCardsMcpServers view toggle', () => {
  beforeEach(() => {
    mockedGetApiV1BetaRegistryByNameServers.override(() => ({
      servers: [],
      remote_servers: [],
    }))

    window.electronAPI.uiPreferences.getViewMode = vi
      .fn()
      .mockResolvedValue('card')
    window.electronAPI.uiPreferences.setViewMode = vi
      .fn()
      .mockResolvedValue(undefined)
  })

  it('renders cards by default and swaps to the table when toggled', async () => {
    const router = makeRouter([baseServer])
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('postgres-db')).toBeVisible()
    })

    expect(screen.queryByRole('columnheader', { name: /server/i })).toBeNull()

    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: /table view/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('columnheader', { name: /server/i })
      ).toBeInTheDocument()
    })
    expect(screen.getByText('postgres-db')).toBeVisible()
  })

  it('persists the table preference through the electronAPI', async () => {
    const router = makeRouter([baseServer])
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('postgres-db')).toBeVisible()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: /table view/i }))

    await waitFor(() => {
      expect(window.electronAPI.uiPreferences.setViewMode).toHaveBeenCalledWith(
        'ui.viewMode.mcpServers',
        'table'
      )
    })
  })

  it('reads the previously persisted view on mount', async () => {
    window.electronAPI.uiPreferences.getViewMode = vi
      .fn()
      .mockResolvedValue('table')

    const router = makeRouter([baseServer])
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('columnheader', { name: /server/i })
      ).toBeInTheDocument()
    })
  })
})
