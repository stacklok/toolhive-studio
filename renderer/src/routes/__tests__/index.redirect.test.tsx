import { describe, it, expect } from 'vitest'
import { waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
} from '@tanstack/react-router'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { Route as IndexRoute } from '../index'

function renderIndexRoute() {
  const beforeLoad = IndexRoute.options.beforeLoad as unknown as (
    ...args: unknown[]
  ) => Promise<void> | void

  const rootRoute = createRootRoute({
    component: Outlet,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
    beforeLoad,
  })

  const skillsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills',
    component: () => <div data-testid="skills-route" />,
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([indexRoute, skillsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    defaultNotFoundComponent: () => null,
  })

  const utils = renderRoute(
    router as unknown as ReturnType<typeof createTestRouter>
  )

  return { ...utils, router }
}

describe('Index route (/)', () => {
  it('redirects to /skills', async () => {
    const { router } = renderIndexRoute()

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/skills')
    })
  })
})
