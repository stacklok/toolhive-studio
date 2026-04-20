import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
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
import { TableBuilds } from '../table-builds'
import { mockedGetApiV1BetaSkillsBuilds } from '@mocks/fixtures/skills_builds/get'
import { mockedGetApiV1BetaDiscoveryClients } from '@mocks/fixtures/discovery_clients/get'

function makeRouter(
  props: { filter: string; onBuild: () => void } = {
    filter: '',
    onBuild: vi.fn(),
  }
) {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })
  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills',
    component: () => (
      <TableBuilds filter={props.filter} onBuild={props.onBuild} />
    ),
  })
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills/builds/$tag',
    component: () => <div data-testid="build-detail-page" />,
  })
  return new Router({
    routeTree: rootRoute.addChildren([listRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries: ['/skills'] }),
    defaultNotFoundComponent: () => null,
  }) as unknown as ReturnType<typeof createTestRouter>
}

beforeEach(() => {
  mockedGetApiV1BetaSkillsBuilds.reset()
  mockedGetApiV1BetaDiscoveryClients.activateScenario('empty')
})

describe('TableBuilds', () => {
  it('renders a row per build with name, version, digest, and description', async () => {
    const router = makeRouter()
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('my-skill')).toBeVisible()
    })

    expect(
      screen.getByRole('columnheader', { name: /build/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /version/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /about/i })
    ).toBeInTheDocument()

    expect(screen.getByText('v1.0.0')).toBeVisible()
    expect(screen.getByText('A locally built skill')).toBeVisible()
    expect(screen.getAllByText(/^sha256:/)[0]).toBeVisible()
  })

  it('shows the empty-state CTA when there are no builds', async () => {
    mockedGetApiV1BetaSkillsBuilds.activateScenario('empty')
    const onBuild = vi.fn()
    const router = makeRouter({ filter: '', onBuild })
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText(/no local builds/i)).toBeVisible()
    })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /build skill/i }))
    expect(onBuild).toHaveBeenCalledTimes(1)
  })

  it('shows the filtered-empty message when the filter matches nothing', async () => {
    const router = makeRouter({ filter: 'zzz-no-match-zzz', onBuild: vi.fn() })
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByText(/no builds found matching the current filter/i)
      ).toBeVisible()
    })
  })

  it('opens install dialog prefilled with the build tag', async () => {
    const user = userEvent.setup()
    const router = makeRouter()
    renderRoute(router)

    const install = await screen.findByRole('button', {
      name: /install my-skill/i,
    })
    await user.click(install)

    await waitFor(() => {
      expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
        'localhost/my-skill:v1.0.0'
      )
    })
  })

  it('opens remove dialog when Remove is clicked', async () => {
    const user = userEvent.setup()
    const router = makeRouter()
    renderRoute(router)

    const remove = await screen.findByRole('button', {
      name: /remove my-skill/i,
    })
    await user.click(remove)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /remove build/i })
      ).toBeVisible()
    })
  })

  it('navigates to the build detail page when a row is clicked', async () => {
    const user = userEvent.setup()
    const router = makeRouter()
    renderRoute(router)

    const row = await screen.findByRole('button', { name: 'my-skill' })
    await user.click(row)

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/\/skills\/builds\//)
    })
  })

  it('does not navigate when Install button is clicked', async () => {
    const user = userEvent.setup()
    const router = makeRouter()
    renderRoute(router)

    const install = await screen.findByRole('button', {
      name: /install my-skill/i,
    })
    await user.click(install)

    expect(router.state.location.pathname).toBe('/skills')
  })
})
