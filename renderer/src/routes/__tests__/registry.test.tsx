import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import * as analytics from '@/common/lib/analytics'
import type { V1GetRegistryResponse } from '@common/api/registry-types'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import RegistryRouteComponent from '../(registry)/-registry.route'
import { APP_IDENTIFIER, DOCS_BASE_URL } from '@common/app-info'
import { mockedGetApiV1BetaRegistryByName } from '@/common/mocks/fixtures/registry_name/get'
import { mockedGetApiV1BetaRegistryByNameServers } from '@/common/mocks/fixtures/registry_name_servers/get'

const router = createTestRouter(RegistryRouteComponent)

beforeEach(() => {
  vi.clearAllMocks()
})

it('renders list of MCP servers', async () => {
  mockedGetApiV1BetaRegistryByNameServers.override(() => ({
    servers: [
      {
        name: 'atlassian',
        image: 'ghcr.io/test/atlassian:latest',
        description: 'Atlassian server',
      },
    ],
    remote_servers: [],
  }))

  renderRoute(router)
  await waitFor(() => {
    expect(
      screen.queryByText('atlassian'),
      'Expected atlassian to be in the document'
    ).toBeVisible()
  })
})

describe('Groups in Registry', () => {
  it('displays groups from registry', async () => {
    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.queryByText('dev-toolkit'),
        'Expected dev-toolkit group to be visible'
      ).toBeVisible()
    })

    expect(
      screen.queryByText('web-scraping'),
      'Expected web-scraping group to be visible'
    ).toBeVisible()

    const groupBadges = screen.queryAllByText('Group')
    expect(groupBadges.length).toBeGreaterThan(0)
  })

  it('handles empty groups array gracefully', async () => {
    mockedGetApiV1BetaRegistryByName.override(
      (data) =>
        ({
          ...data,
          registry: {
            ...(data as V1GetRegistryResponse).registry,
            groups: [],
          },
        }) as unknown as V1GetRegistryResponse
    )
    mockedGetApiV1BetaRegistryByNameServers.override(() => ({
      servers: [
        {
          name: 'atlassian',
          image: 'ghcr.io/test/atlassian:latest',
          description: 'Atlassian server',
        },
      ],
      remote_servers: [],
    }))

    renderRoute(router)

    await waitFor(() => {
      expect(
        screen.queryByText('atlassian'),
        'Expected atlassian to be visible'
      ).toBeVisible()
    })

    const groupBadges = screen.queryAllByText('Group')
    expect(groupBadges.length).toBe(0)
  })
})

describe('Promo Card', () => {
  it('renders promo card on the default registry', async () => {
    mockedGetApiV1BetaRegistryByName.override((data) => ({
      ...data,
      type: 'default',
    }))

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Build a custom registry')).toBeVisible()
    })

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /learn how/i })
      expect(link).toHaveAttribute(
        'href',
        `${DOCS_BASE_URL}/guides-registry/?utm_source=${APP_IDENTIFIER}&utm_medium=app&utm_campaign=custom-registry&utm_content=registry-view-tile&tdi=test-instance-id`
      )
    })
  })

  it('tracks event when CTA is clicked', async () => {
    const trackEventSpy = vi.spyOn(analytics, 'trackEvent')

    mockedGetApiV1BetaRegistryByName.override((data) => ({
      ...data,
      type: 'default',
    }))

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('Build a custom registry')).toBeVisible()
    })

    await userEvent.click(screen.getByRole('link', { name: /learn how/i }))

    expect(trackEventSpy).toHaveBeenCalledWith(
      'Onramp: custom registry docs clicked'
    )
  })

  it('does not render promo card on a custom registry', async () => {
    mockedGetApiV1BetaRegistryByName.override((data) => ({
      ...data,
      type: 'url',
    }))

    renderRoute(router)

    await waitFor(() => {
      expect(screen.queryByText('dev-toolkit')).toBeVisible()
    })

    expect(
      screen.queryByText('Build a custom registry')
    ).not.toBeInTheDocument()
  })
})

describe('Refresh button (custom registry)', () => {
  it('renders a Refresh button when a non-default registry is configured', async () => {
    mockedGetApiV1BetaRegistryByName.override((data) => ({
      ...data,
      type: 'url',
    }))

    renderRoute(router)

    await waitFor(() => {
      expect(screen.queryByText('dev-toolkit')).toBeVisible()
    })

    expect(screen.getByRole('button', { name: /refresh/i })).toBeVisible()
  })
})

describe('Bug: search for "github" should match GitHub MCP servers', () => {
  it('matches an MCP whose user-visible title contains the term ("github") even when name does not', async () => {
    // The Registry tab renders an MCP's `title` (falling back to `name`) as
    // the row label — see `table-registry.tsx` (`server.title ?? server.name`)
    // and `card-registry-server.tsx`. So a user reasonably expects that the
    // text they see in the UI is what the search input matches against.
    //
    // The bug report says searching "github" returns no MCP results. With the
    // production registry, the GitHub MCP server is displayed with the title
    // "GitHub" but is technically registered under a non-"github" name (a
    // packaged variant), so the current filter — which only checks
    // `name + description` — never sees the visible title and drops the row.
    mockedGetApiV1BetaRegistryByName.override(
      (data) =>
        ({
          ...data,
          registry: {
            ...(data as V1GetRegistryResponse).registry,
            groups: [],
          },
        }) as unknown as V1GetRegistryResponse
    )
    mockedGetApiV1BetaRegistryByNameServers.override(() => ({
      servers: [
        {
          name: 'gh-mcp-server',
          title: 'GitHub',
          image: 'mcp/gh-server:latest',
          description: 'Official MCP server for accessing repos and PRs.',
          repository_url: 'https://github.com/github/github-mcp-server',
        },
        {
          name: 'time',
          image: 'mcp/time:latest',
          description: 'Time server.',
        },
      ],
      remote_servers: [],
    }))

    renderRoute(router)

    await waitFor(() => {
      expect(screen.queryByText('GitHub')).toBeVisible()
    })

    const searchInput = screen.getByPlaceholderText('Search...')
    await userEvent.type(searchInput, 'github')

    // The visible title "GitHub" must remain in the document after typing
    // "github" — this is the user-facing label of the row the user is looking
    // for. Currently fails because the filter only inspects name+description.
    await waitFor(() => {
      expect(
        screen.queryByText('GitHub'),
        'MCP row labelled "GitHub" should remain visible when searching "github"'
      ).toBeVisible()
    })

    // The unrelated MCP should be filtered out.
    expect(screen.queryByText('time')).not.toBeInTheDocument()
  })
})
