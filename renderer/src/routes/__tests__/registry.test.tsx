import { screen, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import RegistryRouteComponent from '../(registry)/-registry.route'
import { META_MCP_SERVER_NAME } from '@/common/lib/constants'
import { mockedGetApiV1BetaRegistryByName } from '@/common/mocks/fixtures/registry_name/get'
import { mockedGetApiV1BetaRegistryByNameServers } from '@/common/mocks/fixtures/registry_name_servers/get'
import { setFeatureFlags } from '@mocks/electronAPI'

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
    mockedGetApiV1BetaRegistryByName.override((data) => ({
      ...data,
      registry: {
        ...data.registry,
        groups: [],
      },
    }))
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

describe('Meta-MCP Server Filtering', () => {
  it('hides meta-mcp server when using default registry and META_OPTIMIZER is enabled', async () => {
    setFeatureFlags({ meta_optimizer: true })

    mockedGetApiV1BetaRegistryByNameServers.override(() => ({
      servers: [
        { name: 'atlassian', description: 'Atlassian server' },
        {
          name: META_MCP_SERVER_NAME,
          description: 'Meta MCP server',
        },
      ],
      remote_servers: [],
    }))

    mockedGetApiV1BetaRegistryByName.override((data) => ({
      ...data,
      name: 'default',
    }))

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('atlassian')).toBeVisible()
    })

    expect(screen.queryByText(META_MCP_SERVER_NAME)).not.toBeInTheDocument()
  })

  it('shows meta-mcp server when using custom registry (even with META_OPTIMIZER enabled)', async () => {
    setFeatureFlags({ meta_optimizer: true })

    mockedGetApiV1BetaRegistryByNameServers.override(() => ({
      servers: [
        { name: 'atlassian', description: 'Atlassian server' },
        {
          name: META_MCP_SERVER_NAME,
          description: 'Meta MCP server',
        },
      ],
      remote_servers: [],
    }))

    mockedGetApiV1BetaRegistryByName.override((data) => ({
      ...data,
      name: 'custom-registry',
    }))

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('atlassian')).toBeVisible()
      expect(screen.getByText(META_MCP_SERVER_NAME)).toBeVisible()
    })
  })
})
