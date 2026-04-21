import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
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
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { TableRegistrySkills } from '../table-registry-skills'
import { mockedGetApiV1BetaDiscoveryClients } from '@mocks/fixtures/discovery_clients/get'

const ociSkill: RegistrySkill = {
  name: 'my-skill',
  namespace: 'io.github.user',
  description: 'A helpful skill',
  version: 'v1.0.0',
  packages: [{ registryType: 'oci', identifier: 'ghcr.io/org/my-skill' }],
}

const gitSkill: RegistrySkill = {
  name: 'git-skill',
  namespace: 'io.github.other',
  description: 'A git-based skill',
  version: 'v2.0.0',
  packages: [{ registryType: 'git', identifier: 'https://github.com/x/y' }],
}

const skillNoNamespace: RegistrySkill = {
  name: 'standalone',
}

function makeRouter(skills: RegistrySkill[]) {
  const rootRoute = createRootRoute({
    component: Outlet,
    errorComponent: ({ error }) => <div>{error.message}</div>,
  })
  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills',
    component: () => <TableRegistrySkills skills={skills} />,
  })
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills/$namespace/$skillName',
    component: () => <div data-testid="skill-detail-page" />,
  })
  return new Router({
    routeTree: rootRoute.addChildren([listRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries: ['/skills'] }),
    defaultNotFoundComponent: () => null,
  }) as unknown as ReturnType<typeof createTestRouter>
}

beforeEach(() => {
  mockedGetApiV1BetaDiscoveryClients.activateScenario('empty')
})

describe('TableRegistrySkills', () => {
  it('renders column headers and rows', async () => {
    const router = makeRouter([ociSkill, gitSkill])
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('my-skill')).toBeVisible()
    })

    expect(
      screen.getByRole('columnheader', { name: /skill/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /author/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /about/i })
    ).toBeInTheDocument()

    expect(screen.getByText('io.github.user')).toBeVisible()
    expect(screen.getByText('git-skill')).toBeVisible()
    expect(screen.getByText('A helpful skill')).toBeVisible()
  })

  it('shows an empty state when skills is empty', async () => {
    const router = makeRouter([])
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByText(/no skills found matching the current filter/i)
      ).toBeVisible()
    })
  })

  it('navigates to the skill detail page when a row is clicked', async () => {
    const user = userEvent.setup()
    const router = makeRouter([ociSkill])
    renderRoute(router)

    const row = await screen.findByRole('button', { name: 'my-skill' })
    await user.click(row)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        '/skills/io.github.user/my-skill'
      )
    })
  })

  it('activates a row via the Enter key', async () => {
    const user = userEvent.setup()
    const router = makeRouter([ociSkill])
    renderRoute(router)

    const row = await screen.findByRole('button', { name: 'my-skill' })
    row.focus()
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        '/skills/io.github.user/my-skill'
      )
    })
  })

  it('does not treat a row without namespace/name as a navigable button', async () => {
    const router = makeRouter([skillNoNamespace])
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('standalone')).toBeVisible()
    })
    expect(screen.queryByRole('button', { name: 'standalone' })).toBeNull()
  })

  it('opens install dialog with OCI reference including version', async () => {
    const user = userEvent.setup()
    const router = makeRouter([ociSkill])
    renderRoute(router)

    const install = await screen.findByRole('button', {
      name: /install my-skill/i,
    })
    await user.click(install)

    await waitFor(() => {
      expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
        'io.github.user/my-skill:v1.0.0'
      )
    })
  })

  it('opens install dialog with git reference without version suffix', async () => {
    const user = userEvent.setup()
    const router = makeRouter([gitSkill])
    renderRoute(router)

    const install = await screen.findByRole('button', {
      name: /install git-skill/i,
    })
    await user.click(install)

    await waitFor(() => {
      expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
        'io.github.other/git-skill'
      )
    })
  })

  it('does not navigate when Install button is clicked', async () => {
    const user = userEvent.setup()
    const router = makeRouter([ociSkill])
    renderRoute(router)

    const install = await screen.findByRole('button', {
      name: /install my-skill/i,
    })
    await user.click(install)

    expect(router.state.location.pathname).toBe('/skills')
  })
})
