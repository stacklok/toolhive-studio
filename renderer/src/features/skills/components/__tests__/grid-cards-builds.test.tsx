import { screen, waitFor } from '@testing-library/react'
import { expect, it, vi, describe, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import {
  createRootRoute,
  createRoute,
  Outlet,
  Router,
  createMemoryHistory,
} from '@tanstack/react-router'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { GridCardsBuilds } from '../grid-cards-builds'
import { mockedGetApiV1BetaSkillsBuilds } from '@/common/mocks/fixtures/skills_builds/get'

function createGridTestRouter(
  props: { filter: string; onBuild: () => void } = {
    filter: '',
    onBuild: vi.fn(),
  }
) {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{String(error)}</div>,
  })

  const buildsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills',
    component: () => (
      <GridCardsBuilds filter={props.filter} onBuild={props.onBuild} />
    ),
  })

  const buildDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills/builds/$tag',
    component: () => <div data-testid="build-detail-page" />,
  })

  return new Router({
    routeTree: rootRoute.addChildren([buildsRoute, buildDetailRoute]),
    history: createMemoryHistory({ initialEntries: ['/skills'] }),
    defaultNotFoundComponent: () => null,
  })
}

beforeEach(() => {
  mockedGetApiV1BetaSkillsBuilds.reset()
})

describe('GridCardsBuilds', () => {
  it('renders a card for each build', async () => {
    const router = createGridTestRouter() as unknown as ReturnType<
      typeof createTestRouter
    >
    await router.navigate({ to: '/skills' })
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('my-skill')).toBeInTheDocument()
      expect(screen.getByText('another-skill')).toBeInTheDocument()
    })
  })

  it('shows empty state when there are no builds', async () => {
    mockedGetApiV1BetaSkillsBuilds.activateScenario('empty')
    const router = createGridTestRouter() as unknown as ReturnType<
      typeof createTestRouter
    >
    await router.navigate({ to: '/skills' })
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('No local builds')).toBeInTheDocument()
    })
  })

  it('calls onBuild when the Build skill button in empty state is clicked', async () => {
    mockedGetApiV1BetaSkillsBuilds.activateScenario('empty')
    const user = userEvent.setup()
    const onBuild = vi.fn()
    const router = createGridTestRouter({
      filter: '',
      onBuild,
    }) as unknown as ReturnType<typeof createTestRouter>
    await router.navigate({ to: '/skills' })
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('No local builds')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /build skill/i }))

    expect(onBuild).toHaveBeenCalledTimes(1)
  })

  it('shows filtered-empty message when filter matches nothing', async () => {
    const router = createGridTestRouter({
      filter: 'zzz-no-match-zzz',
      onBuild: vi.fn(),
    }) as unknown as ReturnType<typeof createTestRouter>
    await router.navigate({ to: '/skills' })
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByText('No builds found matching the current filter')
      ).toBeInTheDocument()
    })
  })

  it('filters builds by name', async () => {
    const router = createGridTestRouter({
      filter: 'my-skill',
      onBuild: vi.fn(),
    }) as unknown as ReturnType<typeof createTestRouter>
    await router.navigate({ to: '/skills' })
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('my-skill')).toBeInTheDocument()
      expect(screen.queryByText('another-skill')).not.toBeInTheDocument()
    })
  })
})
