import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
  RouterProvider,
} from '@tanstack/react-router'
import { SkillDetailLayout } from '../skill-detail-layout'

beforeAll(() => {
  class FakeIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds = []
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).IntersectionObserver = FakeIntersectionObserver
})

function renderWithHistory(initialEntries: string[]) {
  const rootRoute = createRootRoute({ component: Outlet })

  const skillsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills',
    component: () => <div data-testid="skills-page">skills page</div>,
  })

  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills_/$namespace/$skillName',
    component: () => (
      <SkillDetailLayout
        title="Test Skill"
        backTo="/skills"
        backSearch={{ tab: 'registry' }}
        actions={<div>actions</div>}
      />
    ),
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([skillsRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries }),
    defaultNotFoundComponent: () => null,
  })

  render(<RouterProvider router={router} />)
  return router
}

describe('SkillDetailLayout Back button', () => {
  it('uses router.history.back() so the previous search params are restored', async () => {
    const user = userEvent.setup()
    const router = renderWithHistory([
      '/skills?tab=registry&page=3&limit=24',
      '/skills_/io.github.test/skill-1',
    ])

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Test Skill' })
      ).toBeVisible()
    })

    await user.click(screen.getAllByRole('link', { name: /back/i })[0]!)

    await waitFor(() => {
      expect(screen.getByTestId('skills-page')).toBeVisible()
    })

    expect(router.state.location.pathname).toBe('/skills')
    expect(router.state.location.search).toMatchObject({
      tab: 'registry',
      page: 3,
      limit: 24,
    })
  })

  it('falls back to the link target when there is no history to go back to (deep-link)', async () => {
    const user = userEvent.setup()
    const router = renderWithHistory(['/skills_/io.github.test/skill-1'])

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Test Skill' })
      ).toBeVisible()
    })

    await user.click(screen.getAllByRole('link', { name: /back/i })[0]!)

    await waitFor(() => {
      expect(screen.getByTestId('skills-page')).toBeVisible()
    })

    expect(router.state.location.pathname).toBe('/skills')
    expect(router.state.location.search).toMatchObject({ tab: 'registry' })
  })
})
