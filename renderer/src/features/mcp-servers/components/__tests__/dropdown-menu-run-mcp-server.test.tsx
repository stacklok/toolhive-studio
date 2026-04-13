import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import type { createTestRouter } from '@/common/test/create-test-router'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'
import userEvent from '@testing-library/user-event'
import {
  createRootRoute,
  createRoute,
  Outlet,
  Router,
  createMemoryHistory,
} from '@tanstack/react-router'
import { DropdownMenuRunMcpServer } from '../dropdown-menu-run-mcp-server'

const openRunCommandDialog = vi.fn()

function createDropdownTestRouter() {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <DropdownMenuRunMcpServer openRunCommandDialog={openRunCommandDialog} />
    ),
  })

  const registryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/registry',
    component: () => <div>Registry</div>,
  })

  return new Router({
    routeTree: rootRoute.addChildren([indexRoute, registryRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    defaultNotFoundComponent: () => null,
  }) as unknown as ReturnType<typeof createTestRouter>
}

describe('DropdownMenuRunMcpServer', () => {
  describe('when custom-mcp-servers permission is true (default)', () => {
    it('shows all three menu options', async () => {
      const router = createDropdownTestRouter()
      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add an mcp server/i })
        ).toBeVisible()
      })

      const user = userEvent.setup()
      await user.click(
        screen.getByRole('button', { name: /add an mcp server/i })
      )

      await waitFor(() => {
        expect(
          screen.getByRole('menuitem', { name: /custom mcp server/i })
        ).toBeVisible()
        expect(
          screen.getByRole('menuitem', { name: /remote mcp server/i })
        ).toBeVisible()
        expect(
          screen.getByRole('menuitem', { name: /from the registry/i })
        ).toBeVisible()
      })
    })
  })

  describe('when custom-mcp-servers permission is false', () => {
    it('hides local and remote options but keeps registry', async () => {
      const router = createDropdownTestRouter()
      renderRoute(router, {
        permissions: {
          [PERMISSION_KEYS.CUSTOM_MCP_SERVERS]: false,
        } as never,
      })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add an mcp server/i })
        ).toBeVisible()
      })

      const user = userEvent.setup()
      await user.click(
        screen.getByRole('button', { name: /add an mcp server/i })
      )

      await waitFor(() => {
        expect(
          screen.getByRole('menuitem', { name: /from the registry/i })
        ).toBeVisible()
      })

      expect(
        screen.queryByRole('menuitem', { name: /custom mcp server/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('menuitem', { name: /remote mcp server/i })
      ).not.toBeInTheDocument()
    })
  })
})
