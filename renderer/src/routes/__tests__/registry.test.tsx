import { screen, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { Registry } from '../(registry)/registry'
import { MOCK_REGISTRY_RESPONSE } from '@/common/mocks/customHandlers/fixtures/registry'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { DEFAULT_REGISTRY } from '@/common/mocks/customHandlers/fixtures/default_registry'
import type { RegistryGroup } from '@api/types.gen'

const router = createTestRouter(Registry)

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks()
})

it('renders list of MCP servers', async () => {
  server.use(
    http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
      return HttpResponse.json({ servers: MOCK_REGISTRY_RESPONSE })
    })
  )

  renderRoute(router)
  await waitFor(() => {
    expect(
      screen.queryByText('atlassian'),
      'Expected atlassian to be in the document'
    ).toBeVisible()
  })

  expect(
    screen.queryByText('mongodb'),
    'Expected mongodb to be in the document'
  ).toBeVisible()
  expect(
    screen.queryByText('redis'),
    'Expected redis to be in the document'
  ).toBeVisible()
})

describe('Groups in Registry', () => {
  const MOCK_GROUPS: RegistryGroup[] = [
    {
      name: 'dev-toolkit',
      description: 'Essential tools for development',
      servers: {
        fetch: MOCK_REGISTRY_RESPONSE[0],
      },
      remote_servers: {},
    },
    {
      name: 'web-scraping',
      description: 'Tools for web scraping',
      servers: {},
      remote_servers: {},
    },
  ]

  it('displays groups from registry', async () => {
    // Mock registry response with groups
    server.use(
      http.get(mswEndpoint('/api/v1beta/registry/:name'), () => {
        return HttpResponse.json({
          ...DEFAULT_REGISTRY,
          registry: {
            ...DEFAULT_REGISTRY.registry,
            groups: MOCK_GROUPS,
          },
        })
      })
    )

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

    // Check that Group badges are displayed
    const groupBadges = screen.queryAllByText('Group')
    expect(groupBadges.length).toBeGreaterThan(0)
  })

  it('handles empty groups array gracefully', async () => {
    // Mock registry response with empty groups
    server.use(
      http.get(mswEndpoint('/api/v1beta/registry/:name'), () => {
        return HttpResponse.json({
          ...DEFAULT_REGISTRY,
          registry: {
            ...DEFAULT_REGISTRY.registry,
            groups: [],
          },
        })
      })
    )

    renderRoute(router)

    await waitFor(() => {
      // Wait for servers to load
      expect(
        screen.queryByText('atlassian'),
        'Expected atlassian to be visible'
      ).toBeVisible()
    })

    // No groups should be displayed
    const groupBadges = screen.queryAllByText('Group')
    expect(groupBadges.length).toBe(0)
  })
})
