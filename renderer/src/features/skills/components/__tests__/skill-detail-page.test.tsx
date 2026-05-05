import { render, screen, waitFor, within } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, beforeAll, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
  RouterProvider,
} from '@tanstack/react-router'
import type { RegistrySkill } from '@common/api/generated/types.gen'
import { SkillDetailPage } from '../skill-detail-page'
import { mockedGetApiV1BetaDiscoveryClients } from '@/common/mocks/fixtures/discovery_clients/get'

const SKILL: RegistrySkill = {
  name: 'skill-creator',
  namespace: 'io.github.stacklok',
  description: 'Creates skills.',
  version: 'v1.0.0',
  packages: [
    {
      registryType: 'oci',
      identifier: 'ghcr.io/stacklok/skill-creator:v1.0.0',
    },
  ],
}

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
  ;(
    globalThis as unknown as { IntersectionObserver: unknown }
  ).IntersectionObserver = FakeIntersectionObserver
})

beforeEach(() => {
  mockedGetApiV1BetaDiscoveryClients.activateScenario('empty')
})

function renderSkillDetailPage(
  props: {
    initialInstall?: boolean
    initialVersion?: string
  },
  options: { skill?: RegistrySkill } = {}
) {
  const skill = options.skill ?? SKILL
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })

  // SkillDetailPage uses LinkViewTransition which needs a router context.
  // Stub a router with a dummy route that renders the page itself.
  const rootRoute = createRootRoute({ component: Outlet })
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills_/$namespace/$skillName',
    component: () => (
      <SkillDetailPage
        skill={skill}
        namespace="io.github.stacklok"
        skillName="skill-creator"
        {...props}
      />
    ),
  })
  const skillsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/skills',
    component: () => <div data-testid="skills-page">skills</div>,
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([detailRoute, skillsRoute]),
    history: createMemoryHistory({
      initialEntries: ['/skills_/io.github.stacklok/skill-creator'],
    }),
    defaultNotFoundComponent: () => null,
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('SkillDetailPage deep-link install flow', () => {
  it('does not open the install dialog by default', async () => {
    renderSkillDetailPage({})

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'skill-creator' })
      ).toBeVisible()
    })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the install dialog on mount when initialInstall=true and prefills the metadata-derived version', async () => {
    renderSkillDetailPage({ initialInstall: true })

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeVisible()
    expect(within(dialog).getByLabelText(/name or reference/i)).toHaveValue(
      'ghcr.io/stacklok/skill-creator'
    )
    expect(within(dialog).getByLabelText(/version/i)).toHaveValue('v1.0.0')
  })

  it('opens the install dialog on mount with initialVersion overriding the metadata version', async () => {
    renderSkillDetailPage({ initialInstall: true, initialVersion: 'v9.9.9' })

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeVisible()
    expect(within(dialog).getByLabelText(/version/i)).toHaveValue('v9.9.9')
  })

  it('reopens the install dialog with a new version when toolhive:open-install-skill-modal fires', async () => {
    renderSkillDetailPage({})

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'skill-creator' })
      ).toBeVisible()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    act(() => {
      window.dispatchEvent(
        new CustomEvent('toolhive:open-install-skill-modal', {
          detail: {
            namespace: 'io.github.stacklok',
            skillName: 'skill-creator',
            version: 'v2.0.0',
          },
        })
      )
    })

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText(/version/i)).toHaveValue('v2.0.0')
  })

  it('ignores toolhive:open-install-skill-modal events for a different skill', async () => {
    renderSkillDetailPage({})

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'skill-creator' })
      ).toBeVisible()
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent('toolhive:open-install-skill-modal', {
          detail: {
            namespace: 'io.github.stacklok',
            skillName: 'other-skill',
          },
        })
      )
    })

    // Give any effects a tick to run before asserting absence
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('matches reopen events using route params even when skill metadata is missing namespace/name', async () => {
    // Regression: registry response can omit skill.namespace / skill.name; the
    // page must still match deep-link reopen events by the URL-derived route
    // params (which are always present), not the optional skill metadata.
    const skillWithoutMetadataIds: RegistrySkill = {
      description: 'No name/namespace on the skill object.',
      packages: [
        {
          registryType: 'oci',
          identifier: 'ghcr.io/stacklok/skill-creator:v1.0.0',
        },
      ],
    }

    renderSkillDetailPage({}, { skill: skillWithoutMetadataIds })

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeVisible()
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent('toolhive:open-install-skill-modal', {
          detail: {
            namespace: 'io.github.stacklok',
            skillName: 'skill-creator',
            version: 'v3.0.0',
          },
        })
      )
    })

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText(/version/i)).toHaveValue('v3.0.0')
  })
})
