import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GroupsManager } from '@/features/mcp-servers/components/groups-manager'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
} from '@tanstack/react-router'
import { mockedGetApiV1BetaGroups } from '@/common/mocks/fixtures/groups/get'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

function createGroupsTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })

  const groupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/group/$groupName',
    component: function GroupRouteComponent() {
      const { groupName } = groupRoute.useParams()
      return <GroupsManager currentGroupName={groupName} />
    },
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([groupRoute]),
    history: createMemoryHistory({ initialEntries: ['/group/default'] }),
  })

  return router
}

const router = createGroupsTestRouter() as unknown as ReturnType<
  typeof createTestRouter
>

beforeEach(() => {
  vi.clearAllMocks()

  Object.defineProperty(window, 'electronAPI', {
    value: {
      shutdownStore: {
        getLastShutdownServers: vi.fn().mockResolvedValue([]),
        clearShutdownHistory: vi.fn().mockResolvedValue(undefined),
      },
      onServerShutdown: vi.fn().mockReturnValue(() => {}),
      featureFlags: {
        get: vi.fn(() => Promise.resolve(false)),
      },
    },
    writable: true,
  })
})

describe('Groups Manager in Index route (feature flagged)', () => {
  it('renders the groups sidebar with all groups', async () => {
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
      expect(screen.getByText('research')).toBeVisible()
      expect(screen.getByText('archive')).toBeVisible()
    })
  })

  it('marks the Default group as active with correct styling', async () => {
    renderRoute(router)

    const defaultGroup = await screen.findByText('default')
    const groupItem = defaultGroup.parentElement as HTMLElement

    expect(groupItem).toHaveClass('rounded-md')
    expect(groupItem).toHaveClass('border', 'border-input')
    expect(groupItem).toHaveClass('bg-background')
    expect(groupItem).toHaveClass('shadow-sm')

    expect(groupItem).toHaveClass('flex', 'h-9', 'w-[215px]', 'px-4', 'py-2')
  })

  it('renders custom groups when provided different data (not hardcoded)', async () => {
    mockedGetApiV1BetaGroups.override((data) => ({
      ...data,
      groups: [
        { name: 'staging', registered_clients: [] },
        { name: 'production', registered_clients: [] },
        { name: 'development', registered_clients: [] },
      ],
    }))

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('staging')).toBeVisible()
      expect(screen.getByText('production')).toBeVisible()
      expect(screen.getByText('development')).toBeVisible()
    })

    expect(screen.queryByText('research')).not.toBeInTheDocument()
    expect(screen.queryByText('archive')).not.toBeInTheDocument()
  })

  it('hides the mcp-optimizer group when META_OPTIMIZER flag is enabled', async () => {
    Object.defineProperty(window, 'electronAPI', {
      value: {
        ...window.electronAPI,
        featureFlags: {
          get: vi.fn((key) => {
            if (key === 'meta_optimizer') return Promise.resolve(true)
            return Promise.resolve(false)
          }),
        },
      },
      writable: true,
    })

    mockedGetApiV1BetaGroups.override((data) => ({
      ...data,
      groups: [
        { name: 'default', registered_clients: [] },
        { name: MCP_OPTIMIZER_GROUP_NAME, registered_clients: [] },
        { name: 'production', registered_clients: [] },
      ],
    }))

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
      expect(screen.getByText('production')).toBeVisible()
    })

    expect(screen.queryByText(MCP_OPTIMIZER_GROUP_NAME)).not.toBeInTheDocument()
  })
})
