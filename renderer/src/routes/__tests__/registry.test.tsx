import { screen, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { Registry } from '../(registry)/registry'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { DEFAULT_REGISTRY } from '@/common/mocks/customHandlers/fixtures/default_registry'
import { META_MCP_SERVER_NAME } from '@/common/lib/constants'

const router = createTestRouter(Registry)

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks()
})

it('renders list of MCP servers', async () => {
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
    Object.defineProperty(window, 'electronAPI', {
      value: {
        featureFlags: {
          get: vi.fn((key) => {
            if (key === 'meta_optimizer') return Promise.resolve(true)
            return Promise.resolve(false)
          }),
        },
      },
      writable: true,
    })

    server.use(
      http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
        return HttpResponse.json({
          servers: [
            { name: 'atlassian', description: 'Atlassian server' },
            { name: META_MCP_SERVER_NAME, description: 'Meta MCP server' },
          ],
          remote_servers: [],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/registry/:name'), () => {
        return HttpResponse.json({
          ...DEFAULT_REGISTRY,
          name: 'default',
        })
      })
    )

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('atlassian')).toBeVisible()
    })

    expect(screen.queryByText(META_MCP_SERVER_NAME)).not.toBeInTheDocument()
  })

  it('shows meta-mcp server when using custom registry (even with META_OPTIMIZER enabled)', async () => {
    Object.defineProperty(window, 'electronAPI', {
      value: {
        featureFlags: {
          get: vi.fn((key) => {
            if (key === 'meta_optimizer') return Promise.resolve(true)
            return Promise.resolve(false)
          }),
        },
      },
      writable: true,
    })

    server.use(
      http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
        return HttpResponse.json({
          servers: [
            { name: 'atlassian', description: 'Atlassian server' },
            { name: META_MCP_SERVER_NAME, description: 'Meta MCP server' },
          ],
          remote_servers: [],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/registry/:name'), () => {
        return HttpResponse.json({
          ...DEFAULT_REGISTRY,
          name: 'custom-registry',
        })
      })
    )

    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('atlassian')).toBeVisible()
      expect(screen.getByText(META_MCP_SERVER_NAME)).toBeVisible()
    })
  })
})
