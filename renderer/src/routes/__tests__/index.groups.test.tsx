import { vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
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
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

function createGroupsTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })

  const groupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/group/$groupName',
    component: () => <GroupsManager />,
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

    server.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () =>
        HttpResponse.json({
          groups: [
            { name: 'default', registered_clients: [] },
            { name: MCP_OPTIMIZER_GROUP_NAME, registered_clients: [] },
            { name: 'production', registered_clients: [] },
          ],
        })
      )
    )

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('default')).toBeVisible()
      expect(screen.getByText('production')).toBeVisible()
    })

    expect(screen.queryByText(MCP_OPTIMIZER_GROUP_NAME)).not.toBeInTheDocument()
  })
})
