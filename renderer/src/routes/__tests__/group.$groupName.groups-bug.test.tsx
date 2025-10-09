import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/common/mocks/node'
import { GroupRoute } from '../group.$groupName'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'

// Mock CSS imports
vi.mock('katex/dist/katex.min.css', () => ({}))

// Mock the feature flag to simulate enabling/disabling groups
let groupsFeatureEnabled = false

const mockFeatureFlagAPI = {
  get: vi.fn(async (key: string) => {
    if (key === 'groups') return groupsFeatureEnabled
    return false
  }),
  enable: vi.fn(),
  disable: vi.fn(),
  getAll: vi.fn(),
}

// Mock the params to return 'default' as the group name
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useParams: () => ({ groupName: 'default' }),
  }
})

describe('Groups Bug - All servers showing in default group', () => {
  beforeEach(() => {
    // Reset feature flag state
    groupsFeatureEnabled = false

    // Mock electron API
    window.electronAPI = {
      featureFlags: mockFeatureFlagAPI,
      getToolhivePort: vi.fn().mockResolvedValue(50086),
      getTelemetryHeaders: vi.fn().mockResolvedValue({}),
      sentry: { isEnabled: false },
      getInstanceId: vi.fn().mockResolvedValue('test-instance'),
      onServerShutdown: vi.fn().mockReturnValue(() => {}),
      onUpdateDownloaded: vi.fn().mockReturnValue(() => {}),
      isUpdateInProgress: vi.fn().mockResolvedValue(false),
      isToolhiveRunning: vi.fn().mockResolvedValue(true),
      shutdownStore: {
        getLastShutdownServers: vi.fn().mockResolvedValue([]),
      },
    } as any
  })

  afterEach(() => {
    vi.clearAllMocks()
    server.resetHandlers() // Reset MSW handlers to defaults after each test
  })

  it.fails('reproduces bug: all servers show in default group after enabling groups feature', async () => {
    // Setup: Create workloads in different groups
    const workloadsInDefaultGroup = [
      { name: 'server-default-1', group: 'default', status: 'running' },
      { name: 'server-default-2', group: 'default', status: 'running' },
    ]

    const workloadsInTestGroup = [
      { name: 'server-test-1', group: 'test-group', status: 'running' },
      { name: 'server-test-2', group: 'test-group', status: 'running' },
    ]

    const allWorkloads = [...workloadsInDefaultGroup, ...workloadsInTestGroup]

    // Mock API responses - need to use the base URL from environment
    const baseUrl = 'https://foo.bar.com'

    server.use(
      // Health check
      http.get(`${baseUrl}/health`, () => {
        return HttpResponse.json({ status: 'ok' })
      }),

      // Secrets provider
      http.get(`${baseUrl}/api/v1beta/secrets/default`, () => {
        return HttpResponse.json({ provider_type: 'encrypted' })
      }),

      // Groups list
      http.get(`${baseUrl}/api/v1beta/groups`, () => {
        return HttpResponse.json({
          groups: [
            { name: 'default' },
            { name: 'test-group' }
          ]
        })
      }),

      // Workloads endpoint - the critical one
      http.get(`${baseUrl}/api/v1beta/workloads`, ({ request }) => {
        const url = new URL(request.url)
        const group = url.searchParams.get('group')

        console.log('API called with group:', group)

        // BUG SCENARIO: If group is empty string, return ALL workloads
        if (group === '') {
          console.log('🐛 BUG: Empty group parameter - returning all workloads!')
          return HttpResponse.json({ workloads: allWorkloads })
        }

        // Normal filtering
        if (group === 'default') {
          return HttpResponse.json({ workloads: workloadsInDefaultGroup })
        }

        if (group === 'test-group') {
          return HttpResponse.json({ workloads: workloadsInTestGroup })
        }

        // No group param - return all
        if (group === null) {
          return HttpResponse.json({ workloads: allWorkloads })
        }

        return HttpResponse.json({ workloads: [] })
      })
    )

    // STEP 1: Simulate groups feature being DISABLED initially
    groupsFeatureEnabled = false

    // STEP 2: Enable groups feature (simulating Dan toggling it)
    groupsFeatureEnabled = true

    // STEP 3: Create router and render (simulating app restart)
    function WrapperComponent() {
      return <GroupRoute />
    }

    const router = createTestRouter(WrapperComponent, '/group/default')
    renderRoute(router)

    // Wait for the route to load
    await waitFor(() => {
      expect(screen.getByText('MCP Servers')).toBeInTheDocument()
    }, { timeout: 5000 })

    // ASSERTION: Should only show servers from default group
    await waitFor(() => {
      expect(screen.getByText('server-default-1')).toBeInTheDocument()
      expect(screen.getByText('server-default-2')).toBeInTheDocument()
    })

    // BUG ASSERTION: These servers from test-group should NOT be visible
    // Currently this test FAILS because the bug exists - servers from test-group ARE visible
    // This test documents the bug that Dan Barr reported
    const testServer1 = screen.queryByText('server-test-1')
    const testServer2 = screen.queryByText('server-test-2')

    // TODO: Fix the bug - the route should pass group='default' to the API
    // Currently it passes group=null, which returns ALL workloads
    if (testServer1 || testServer2) {
      // Bug is present - this test will fail until the bug is fixed
      // The expected behavior is that only default group servers show
      console.log('🐛 BUG DETECTED: Servers from other groups are visible in default group')
      console.log('Expected: group parameter should be "default", Actual: group parameter is null')
    }

    // This expectation will FAIL until the bug is fixed
    // When fixed, only default group servers should be visible
    expect(testServer1).not.toBeInTheDocument()
    expect(testServer2).not.toBeInTheDocument()
  })

  it.todo('should show correct behavior: only default group servers in default group', async () => {
    // This test shows the CORRECT behavior for comparison
    const workloadsInDefaultGroup = [
      { name: 'server-default-1', group: 'default', status: 'running' },
      { name: 'server-default-2', group: 'default', status: 'running' },
    ]

    const baseUrl = 'https://foo.bar.com'

    server.use(
      http.get(`${baseUrl}/health`, () => {
        return HttpResponse.json({ status: 'ok' })
      }),

      http.get(`${baseUrl}/api/v1beta/secrets/default`, () => {
        return HttpResponse.json({ provider_type: 'encrypted' })
      }),

      http.get(`${baseUrl}/api/v1beta/groups`, () => {
        return HttpResponse.json({
          groups: [{ name: 'default' }]
        })
      }),

      // Correct API behavior - properly filters by group
      http.get(`${baseUrl}/api/v1beta/workloads`, ({ request }) => {
        const url = new URL(request.url)
        const group = url.searchParams.get('group')

        if (group === 'default') {
          return HttpResponse.json({ workloads: workloadsInDefaultGroup })
        }

        return HttpResponse.json({ workloads: [] })
      })
    )

    groupsFeatureEnabled = true

    function WrapperComponent() {
      return <GroupRoute />
    }

    const router = createTestRouter(WrapperComponent, '/group/default')
    renderRoute(router)

    await waitFor(() => {
      expect(screen.getByText('server-default-1')).toBeInTheDocument()
      expect(screen.getByText('server-default-2')).toBeInTheDocument()
    })
  })
})
