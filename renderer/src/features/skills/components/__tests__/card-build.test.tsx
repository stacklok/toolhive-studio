import { screen, waitFor } from '@testing-library/react'
import { expect, it, describe, beforeEach } from 'vitest'
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
import { CardBuild } from '../card-build'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'

const baseBuild: LocalBuild = {
  name: 'my-skill',
  description: 'A locally built skill',
  tag: 'localhost/my-skill:v1.0.0',
  version: 'v1.0.0',
  digest:
    'sha256:abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
}

function createCardTestRouter(build: LocalBuild = baseBuild) {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{String(error)}</div>,
  })

  const buildsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills',
    component: () => <CardBuild build={build} />,
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

const router = createCardTestRouter() as unknown as ReturnType<
  typeof createTestRouter
>

beforeEach(async () => {
  await router.navigate({ to: '/skills' })
})

describe('CardBuild', () => {
  it('renders skill name from build.name', () => {
    renderRoute(router)
    expect(screen.getByText('my-skill')).toBeInTheDocument()
  })

  it('falls back to tag when name is absent', async () => {
    const buildRouter = createCardTestRouter({
      tag: 'localhost/my-skill:v1.0.0',
    }) as unknown as ReturnType<typeof createTestRouter>
    await buildRouter.navigate({ to: '/skills' })
    renderRoute(buildRouter)
    expect(
      screen.getAllByText('localhost/my-skill:v1.0.0').length
    ).toBeGreaterThan(0)
  })

  it('shows "Unnamed build" when neither name nor tag', async () => {
    const buildRouter = createCardTestRouter({}) as unknown as ReturnType<
      typeof createTestRouter
    >
    await buildRouter.navigate({ to: '/skills' })
    renderRoute(buildRouter)
    expect(screen.getByText('Unnamed build')).toBeInTheDocument()
  })

  it('renders description and digest in content', () => {
    renderRoute(router)
    expect(screen.getAllByText(/A locally built skill/).length).toBeGreaterThan(
      0
    )
    expect(screen.getAllByText(/sha256:/).length).toBeGreaterThan(0)
  })

  it('renders version badge', () => {
    renderRoute(router)
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
  })

  it('opens install dialog when Install button is clicked', async () => {
    const user = userEvent.setup()
    renderRoute(router)

    await user.click(screen.getByRole('button', { name: /install my-skill/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /install skill/i })
      ).toBeInTheDocument()
    })
  })

  it('prefills install dialog with build name in the name field and version in the version field', async () => {
    const user = userEvent.setup()
    renderRoute(router)

    await user.click(screen.getByRole('button', { name: /install my-skill/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
        'my-skill'
      )
      expect(screen.getByLabelText(/^version/i)).toHaveValue('v1.0.0')
    })
  })

  it('opens remove dialog when Remove button is clicked', async () => {
    const user = userEvent.setup()
    renderRoute(router)

    await user.click(screen.getByRole('button', { name: /remove my-skill/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /remove build/i })
      ).toBeInTheDocument()
    })
  })

  it('shows build name in remove dialog confirmation text', async () => {
    const user = userEvent.setup()
    renderRoute(router)

    await user.click(screen.getByRole('button', { name: /remove my-skill/i }))

    await waitFor(() => {
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveTextContent('my-skill')
    })
  })

  it('navigates to build detail page when card is clicked', async () => {
    const user = userEvent.setup()
    renderRoute(router)

    await user.click(screen.getByText('my-skill'))

    await waitFor(() => {
      expect(router.state.location.pathname).toMatch(/\/skills\/builds\//)
    })
  })
})
