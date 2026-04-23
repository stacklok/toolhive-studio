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
import { CardRegistrySkill } from '../card-registry-skill'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { mockedGetApiV1BetaDiscoveryClients } from '@mocks/fixtures/discovery_clients/get'

const baseSkill: RegistrySkill = {
  name: 'my-skill',
  namespace: 'io.github.user',
  description: 'A helpful skill for testing',
}

function createCardTestRouter(skill: RegistrySkill = baseSkill) {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{String(error)}</div>,
  })

  const skillsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills',
    component: () => <CardRegistrySkill skill={skill} />,
  })

  const skillDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills/$namespace/$skillName',
    component: () => <div data-testid="skill-detail-page" />,
  })

  return new Router({
    routeTree: rootRoute.addChildren([skillsRoute, skillDetailRoute]),
    history: createMemoryHistory({ initialEntries: ['/skills'] }),
    defaultNotFoundComponent: () => null,
  })
}

const router = createCardTestRouter() as unknown as ReturnType<
  typeof createTestRouter
>

beforeEach(async () => {
  mockedGetApiV1BetaDiscoveryClients.activateScenario('empty')
  await router.navigate({ to: '/skills' })
})

describe('CardRegistrySkill', () => {
  describe('rendering', () => {
    it('renders the skill name', () => {
      renderRoute(router)
      expect(screen.getByText('my-skill')).toBeVisible()
    })

    it('renders the namespace', () => {
      renderRoute(router)
      expect(screen.getByText('io.github.user')).toBeVisible()
    })

    it('renders the description', () => {
      renderRoute(router)
      expect(screen.getByText('A helpful skill for testing')).toBeVisible()
    })

    it('shows "Unknown skill" when name is absent', async () => {
      const skillRouter = createCardTestRouter({
        namespace: 'io.github.user',
      }) as unknown as ReturnType<typeof createTestRouter>
      await skillRouter.navigate({ to: '/skills' })
      renderRoute(skillRouter)
      expect(screen.getByText('Unknown skill')).toBeVisible()
    })

    it('does not render namespace row when namespace is absent', async () => {
      const skillRouter = createCardTestRouter({
        name: 'my-skill',
      }) as unknown as ReturnType<typeof createTestRouter>
      await skillRouter.navigate({ to: '/skills' })
      renderRoute(skillRouter)
      expect(screen.queryByText('io.github.user')).not.toBeInTheDocument()
    })

    it('does not render description when absent', async () => {
      const skillRouter = createCardTestRouter({
        name: 'my-skill',
        namespace: 'io.github.user',
      }) as unknown as ReturnType<typeof createTestRouter>
      await skillRouter.navigate({ to: '/skills' })
      renderRoute(skillRouter)
      expect(
        screen.queryByText('A helpful skill for testing')
      ).not.toBeInTheDocument()
    })

    it('renders the Install button', () => {
      renderRoute(router)
      expect(screen.getByRole('button', { name: /install/i })).toBeVisible()
    })

    it('does not render a GitHub link when repository is absent', () => {
      renderRoute(router)
      expect(
        screen.queryByRole('link', { name: /open repository on github/i })
      ).not.toBeInTheDocument()
    })

    it('renders a GitHub link when repository.url is set', async () => {
      const skillRouter = createCardTestRouter({
        ...baseSkill,
        repository: {
          type: 'git',
          url: 'https://github.com/example/skills',
        },
      }) as unknown as ReturnType<typeof createTestRouter>
      await skillRouter.navigate({ to: '/skills' })
      renderRoute(skillRouter)

      const link = screen.getByRole('link', {
        name: /open repository on github/i,
      })
      expect(link).toBeVisible()
      expect(link).toHaveAttribute('href', 'https://github.com/example/skills')
      expect(link).toHaveAttribute('target', '_blank')
    })
  })

  describe('navigation', () => {
    it('navigates to the skill detail page when the card is clicked', async () => {
      const user = userEvent.setup()
      renderRoute(router)

      await user.click(screen.getByText('my-skill'))

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(
          '/skills/io.github.user/my-skill'
        )
      })
    })

    it('does not navigate when Install button is clicked', async () => {
      const user = userEvent.setup()
      renderRoute(router)

      await user.click(screen.getByRole('button', { name: /install/i }))

      expect(router.state.location.pathname).toBe('/skills')
    })

    it('does not navigate to the detail page when the GitHub link is clicked', async () => {
      const user = userEvent.setup()
      const skillRouter = createCardTestRouter({
        ...baseSkill,
        repository: {
          type: 'git',
          url: 'https://github.com/example/skills',
        },
      }) as unknown as ReturnType<typeof createTestRouter>
      await skillRouter.navigate({ to: '/skills' })
      renderRoute(skillRouter)

      const link = screen.getByRole('link', {
        name: /open repository on github/i,
      })
      await user.click(link)

      expect(skillRouter.state.location.pathname).toBe('/skills')
    })
  })

  describe('install dialog', () => {
    it('opens the install dialog when Install button is clicked', async () => {
      const user = userEvent.setup()
      renderRoute(router)

      await user.click(screen.getByRole('button', { name: /install/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /install skill/i })
        ).toBeVisible()
      })
    })

    it('prefills the install dialog with the OCI package identifier', async () => {
      const user = userEvent.setup()
      const skillRouter = createCardTestRouter({
        ...baseSkill,
        version: 'v1.2.3',
        packages: [{ registryType: 'oci', identifier: 'ghcr.io/org/my-skill' }],
      }) as unknown as ReturnType<typeof createTestRouter>
      await skillRouter.navigate({ to: '/skills' })
      renderRoute(skillRouter)

      await user.click(screen.getByRole('button', { name: /install/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
          'ghcr.io/org/my-skill'
        )
      })
    })

    it('prefills the install dialog with namespace/name for non-OCI skills', async () => {
      const user = userEvent.setup()
      renderRoute(router)

      await user.click(screen.getByRole('button', { name: /install/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
          'io.github.user/my-skill'
        )
      })
    })
  })
})
