import { screen, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { Registry } from '../(registry)/registry'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { DEFAULT_REGISTRY } from '@/common/mocks/customHandlers/fixtures/default_registry'

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
