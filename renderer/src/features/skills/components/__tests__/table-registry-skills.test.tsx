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
  repository: { type: 'git', url: 'https://github.com/org/repo' },
}

const taggedOciSkill: RegistrySkill = {
  name: 'tagged-skill',
  namespace: 'io.github.user',
  description: 'A skill whose OCI identifier already includes a tag',
  packages: [
    { registryType: 'oci', identifier: 'ghcr.io/org/tagged-skill:v1.2.3' },
  ],
}

const ociSkillWithRef: RegistrySkill = {
  name: 'ref-skill',
  namespace: 'io.github.user',
  description: 'A skill with a separate OCI ref',
  packages: [
    {
      registryType: 'oci',
      identifier: 'ghcr.io/org/ref-skill',
      ref: 'v3.4.5',
    },
  ],
}

const gitSkill: RegistrySkill = {
  name: 'git-skill',
  namespace: 'io.github.other',
  description: 'A git-based skill',
  version: 'v2.0.0',
  packages: [{ registryType: 'git', url: 'https://github.com/x/y' }],
}

const skillNoNamespace: RegistrySkill = {
  name: 'standalone',
}

const skillUnparseableRepo: RegistrySkill = {
  name: 'weird-repo-skill',
  namespace: 'io.github.weird',
  description: 'Skill with an unparseable repository URL',
  repository: { type: 'git', url: 'not-a-valid-url' },
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
      screen.getByRole('columnheader', { name: /about/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /original repo/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: /registry/i })
    ).not.toBeInTheDocument()

    expect(screen.getByText('git-skill')).toBeVisible()
    expect(screen.getByText('A helpful skill')).toBeVisible()
    expect(screen.getByText('org/repo')).toBeVisible()
  })

  it('shows an empty state when skills is empty', async () => {
    const router = makeRouter([])
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /no skills found/i })
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

  it('opens install dialog with OCI identifier and falls back to skill.version when no tag/ref is present', async () => {
    const user = userEvent.setup()
    const router = makeRouter([ociSkill])
    renderRoute(router)

    const install = await screen.findByRole('button', {
      name: /install my-skill/i,
    })
    await user.click(install)

    await waitFor(() => {
      expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
        'ghcr.io/org/my-skill'
      )
    })
    expect(screen.getByPlaceholderText(/e\.g\. v1\.0\.0/i)).toHaveValue(
      'v1.0.0'
    )
  })

  it('splits a tagged OCI identifier so the version fills the version field', async () => {
    const user = userEvent.setup()
    const router = makeRouter([taggedOciSkill])
    renderRoute(router)

    const install = await screen.findByRole('button', {
      name: /install tagged-skill/i,
    })
    await user.click(install)

    await waitFor(() => {
      expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
        'ghcr.io/org/tagged-skill'
      )
    })
    expect(screen.getByPlaceholderText(/e\.g\. v1\.0\.0/i)).toHaveValue(
      'v1.2.3'
    )
  })

  it('uses the package ref to prefill the version field for bare OCI identifiers', async () => {
    const user = userEvent.setup()
    const router = makeRouter([ociSkillWithRef])
    renderRoute(router)

    const install = await screen.findByRole('button', {
      name: /install ref-skill/i,
    })
    await user.click(install)

    await waitFor(() => {
      expect(screen.getByLabelText(/name or reference/i)).toHaveValue(
        'ghcr.io/org/ref-skill'
      )
    })
    expect(screen.getByPlaceholderText(/e\.g\. v1\.0\.0/i)).toHaveValue(
      'v3.4.5'
    )
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
        'git-skill'
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

  it('renders a repository link with the normalized repo label for skills with a repository url', async () => {
    const router = makeRouter([ociSkill, gitSkill])
    renderRoute(router)

    const links = await screen.findAllByRole('link', { name: /org\/repo/i })
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', 'https://github.com/org/repo')
    expect(links[0]).toHaveAttribute('target', '_blank')
    expect(links[0]).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('falls back to the raw URL when the repository URL cannot be normalized', async () => {
    const router = makeRouter([skillUnparseableRepo])
    renderRoute(router)

    const link = await screen.findByRole('link', { name: /not-a-valid-url/i })
    expect(link).toHaveAttribute('href', 'not-a-valid-url')
    expect(screen.getByText('not-a-valid-url')).toBeVisible()
  })

  it('does not render a repository link for skills without a repository', async () => {
    const router = makeRouter([gitSkill])
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('git-skill')).toBeVisible()
    })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('does not navigate to the detail page when the repository link is clicked', async () => {
    const user = userEvent.setup()
    const router = makeRouter([ociSkill])
    renderRoute(router)

    const link = await screen.findByRole('link', { name: /org\/repo/i })
    await user.click(link)

    expect(router.state.location.pathname).toBe('/skills')
  })
})
