import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { server, recordRequests } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { toast } from 'sonner'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import log from 'electron-log/renderer'
import {
  ALLOWED_GROUPS_ENV_VAR,
  MCP_OPTIMIZER_GROUP_NAME,
  MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import { useCreateOptimizerWorkload } from '../use-create-optimizer-workload'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { useMcpOptimizerClients } from '@/features/meta-mcp/hooks/use-mcp-optimizer-clients'
import type { V1CreateRequest } from '@api/types.gen'

vi.mock('@/common/hooks/use-feature-flag', () => ({
  useFeatureFlag: vi.fn(),
}))

vi.mock('@/features/meta-mcp/hooks/use-mcp-optimizer-clients', () => ({
  useMcpOptimizerClients: vi.fn(() => ({
    saveGroupClients: vi.fn().mockResolvedValue(undefined),
    restoreClientsToGroup: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('@/common/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn((promise) => {
      // Execute the promise to trigger any side effects
      promise.catch(() => {})
      return promise
    }),
  },
}))

vi.mock('electron-log/renderer', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

Object.defineProperty(window, 'electronAPI', {
  value: {
    isLinux: false,
  },
  writable: true,
  configurable: true,
})

const createQueryClientWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  return { queryClient, Wrapper }
}

describe('useCreateOptimizerWorkload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: { isLinux: false },
      writable: true,
      configurable: true,
    })
  })

  describe('when feature flags are disabled', () => {
    it('returns isNotEnabled as true when META_OPTIMIZER is disabled', async () => {
      vi.mocked(useFeatureFlag).mockImplementation((key) => {
        if (key === 'meta_optimizer') return false
        return false
      })

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      expect(result.current.isNotEnabled).toBe(true)
    })

    it('returns isNotEnabled as true when both feature flags are disabled', async () => {
      vi.mocked(useFeatureFlag).mockReturnValue(false)

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      expect(result.current.isNotEnabled).toBe(true)
    })

    it('does not create workload when isNotEnabled is true', async () => {
      vi.mocked(useFeatureFlag).mockReturnValue(false)

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      await result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'default',
        optimized_workloads: [],
      })

      expect(toast.success).not.toHaveBeenCalled()
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe('when feature flags are enabled', () => {
    beforeEach(() => {
      vi.mocked(useFeatureFlag).mockReturnValue(true)
      // Reset useMcpOptimizerClients mock to default
      vi.mocked(useMcpOptimizerClients).mockReturnValue({
        saveGroupClients: vi.fn().mockResolvedValue(undefined),
        restoreClientsToGroup: vi.fn().mockResolvedValue(undefined),
      })
    })

    it('returns isNotEnabled as false when both flags are enabled', async () => {
      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      expect(result.current.isNotEnabled).toBe(false)
    })

    it('loads optimizer workload detail when it exists', async () => {
      server.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
          const { name } = params
          if (name === META_MCP_SERVER_NAME) {
            return HttpResponse.json({
              name: META_MCP_SERVER_NAME,
              group: MCP_OPTIMIZER_GROUP_NAME,
              image: 'ghcr.io/stackloklabs/meta-mcp:latest',
              status: 'running',
              env_vars: {
                [ALLOWED_GROUPS_ENV_VAR]: 'default',
              },
            })
          }
          return HttpResponse.json({ error: 'Not found' }, { status: 404 })
        })
      )

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.optimizerWorkloadDetail).toBeDefined()
        expect(result.current.optimizerWorkloadDetail?.name).toBe(
          META_MCP_SERVER_NAME
        )
      })
    })

    it('returns isMCPOptimizerEnabled as true when workload has ALLOWED_GROUPS env var', async () => {
      server.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
          const { name } = params
          if (name === META_MCP_SERVER_NAME) {
            return HttpResponse.json({
              name: META_MCP_SERVER_NAME,
              group: MCP_OPTIMIZER_GROUP_NAME,
              env_vars: {
                [ALLOWED_GROUPS_ENV_VAR]: 'default',
              },
            })
          }
          return HttpResponse.json({ error: 'Not found' }, { status: 404 })
        })
      )

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isMCPOptimizerEnabled).toBe(true)
      })
    })

    it('returns isMCPOptimizerEnabled as false when workload exists without ALLOWED_GROUPS env var', async () => {
      server.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
          const { name } = params
          if (name === META_MCP_SERVER_NAME) {
            return HttpResponse.json({
              name: META_MCP_SERVER_NAME,
              group: MCP_OPTIMIZER_GROUP_NAME,
              env_vars: {},
            })
          }
          return HttpResponse.json({ error: 'Not found' }, { status: 404 })
        })
      )

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.optimizerWorkloadDetail).toBeDefined()
      })

      expect(result.current.isMCPOptimizerEnabled).toBe(false)
    })

    it('returns isMCPOptimizerEnabled as false when workload does not exist', async () => {
      server.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () =>
          HttpResponse.json({ error: 'Not found' }, { status: 404 })
        )
      )

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.optimizerWorkloadDetail).toBeUndefined()
      })

      expect(result.current.isMCPOptimizerEnabled).toBe(false)
    })

    it('successfully creates workload with correct parameters', async () => {
      const rec = recordRequests()

      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          ({ params }) => {
            const { serverName } = params
            if (serverName === MCP_OPTIMIZER_REGISTRY_SERVER_NAME) {
              return HttpResponse.json({
                server: {
                  image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                  transport: 'streamable-http',
                },
              })
            }
            return HttpResponse.json({ server: null })
          }
        ),
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({
            groups: [
              {
                name: 'test-group',
                registered_clients: [],
              },
              {
                name: MCP_OPTIMIZER_GROUP_NAME,
                registered_clients: [],
              },
            ],
          })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () => {
          return HttpResponse.json({
            name: META_MCP_SERVER_NAME,
            group: MCP_OPTIMIZER_GROUP_NAME,
          })
        })
      )

      const { Wrapper, queryClient } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      expect(result.current.isNotEnabled).toBe(false)

      // Wait for the registry server query to complete
      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0)
      })

      await result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'test-group',
        optimized_workloads: ['server1', 'server2'],
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Verify the POST request was made with correct payload
      await waitFor(() => {
        const postRequest = rec.recordedRequests.find(
          (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
        )
        expect(postRequest).toBeDefined()
      })

      const postRequest = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
      )

      expect(postRequest?.payload).toEqual({
        name: META_MCP_SERVER_NAME,
        image: 'ghcr.io/stackloklabs/meta-mcp:latest',
        transport: 'streamable-http',
        group: MCP_OPTIMIZER_GROUP_NAME,
        env_vars: {
          [ALLOWED_GROUPS_ENV_VAR]: 'test-group',
        },
        secrets: [],
        cmd_arguments: [],
        network_isolation: false,
        volumes: [],
      })

      expect(toast.success).toHaveBeenCalledWith(
        'MCP Optimizer installed and running'
      )
      expect(log.info).toHaveBeenCalledWith(
        'MCP Optimizer workload created',
        expect.any(Object)
      )
    })

    it('handles API error when workload creation fails', async () => {
      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () =>
            HttpResponse.json({
              server: {
                image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                transport: 'streamable-http',
              },
            })
        ),
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({
            groups: [
              {
                name: 'test-group',
                registered_clients: [],
              },
              {
                name: MCP_OPTIMIZER_GROUP_NAME,
                registered_clients: [],
              },
            ],
          })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () =>
          HttpResponse.json(
            { error: 'Failed to create workload' },
            { status: 500 }
          )
        )
      )

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      expect(result.current.isNotEnabled).toBe(false)

      await result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'test-group',
        optimized_workloads: [],
      })

      await waitFor(() => {
        expect(log.error).toHaveBeenCalledWith(
          'Failed to create MCP Optimizer workload',
          expect.any(Object)
        )
      })
    })

    it('sets isPending to true during workload creation', async () => {
      let resolveRequest: (value: unknown) => void
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve
      })

      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () =>
            HttpResponse.json({
              server: {
                image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                transport: 'streamable-http',
              },
            })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), async () => {
          await requestPromise
          return HttpResponse.json({
            name: META_MCP_SERVER_NAME,
            group: MCP_OPTIMIZER_GROUP_NAME,
          })
        })
      )

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(result.current.isNotEnabled).toBe(false)
      })

      result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'test-group',
        optimized_workloads: [],
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(true)
      })

      resolveRequest!(null)

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })
    })

    it('handles missing registry server details gracefully', async () => {
      const rec = recordRequests()

      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () => HttpResponse.json({ server: null })
        ),
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({
            groups: [
              {
                name: 'test-group',
                registered_clients: [],
              },
              {
                name: MCP_OPTIMIZER_GROUP_NAME,
                registered_clients: [],
              },
            ],
          })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () => {
          return HttpResponse.json({
            name: META_MCP_SERVER_NAME,
            group: MCP_OPTIMIZER_GROUP_NAME,
          })
        })
      )

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      expect(result.current.isNotEnabled).toBe(false)

      await result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'test-group',
        optimized_workloads: [],
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Verify the POST request was made with undefined image/transport
      await waitFor(() => {
        const postRequest = rec.recordedRequests.find(
          (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
        )
        expect(postRequest).toBeDefined()
      })

      const postRequest = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
      )

      // Should still create workload but with undefined image/transport
      expect(postRequest?.payload).toMatchObject({
        name: META_MCP_SERVER_NAME,
        group: MCP_OPTIMIZER_GROUP_NAME,
        env_vars: {
          [ALLOWED_GROUPS_ENV_VAR]: 'test-group',
        },
      })
      expect(
        (postRequest?.payload as { image?: string })?.image
      ).toBeUndefined()
      expect(
        (postRequest?.payload as { transport?: string })?.transport
      ).toBeUndefined()

      expect(toast.success).toHaveBeenCalledWith(
        'MCP Optimizer installed and running'
      )
    })

    it('passes correct group name in env_vars when creating workload', async () => {
      const testGroups = ['default', 'research', 'production']

      for (const groupName of testGroups) {
        vi.clearAllMocks()
        const rec = recordRequests()

        server.use(
          http.get(
            mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
            () =>
              HttpResponse.json({
                server: {
                  image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                  transport: 'streamable-http',
                },
              })
          ),
          http.get(mswEndpoint('/api/v1beta/groups'), () =>
            HttpResponse.json({
              groups: [
                {
                  name: groupName,
                  registered_clients: [],
                },
                {
                  name: MCP_OPTIMIZER_GROUP_NAME,
                  registered_clients: [],
                },
              ],
            })
          ),
          http.post(mswEndpoint('/api/v1beta/workloads'), () => {
            return HttpResponse.json({
              name: META_MCP_SERVER_NAME,
              group: MCP_OPTIMIZER_GROUP_NAME,
            })
          })
        )

        const { Wrapper } = createQueryClientWrapper()
        const { result } = renderHook(() => useCreateOptimizerWorkload(), {
          wrapper: Wrapper,
        })

        await waitFor(() => {
          expect(result.current.isNotEnabled).toBe(false)
        })

        await result.current.handleCreateMetaOptimizerWorkload({
          groupToOptimize: groupName,
          optimized_workloads: [],
        })

        await waitFor(() => {
          expect(result.current.isPending).toBe(false)
        })

        // Verify correct group name in payload
        await waitFor(() => {
          const postRequest = rec.recordedRequests.find(
            (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
          )
          expect(postRequest).toBeDefined()
        })

        const postRequest = rec.recordedRequests.find(
          (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
        )

        expect(postRequest?.payload).toMatchObject({
          env_vars: { [ALLOWED_GROUPS_ENV_VAR]: groupName },
        })
      }
    })

    it('handles network errors during workload creation', async () => {
      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () =>
            HttpResponse.json({
              server: {
                image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                transport: 'streamable-http',
              },
            })
        ),
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({
            groups: [
              {
                name: 'test-group',
                registered_clients: [],
              },
              {
                name: MCP_OPTIMIZER_GROUP_NAME,
                registered_clients: [],
              },
            ],
          })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () =>
          HttpResponse.error()
        )
      )

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      expect(result.current.isNotEnabled).toBe(false)

      await result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'test-group',
        optimized_workloads: [],
      })

      await waitFor(() => {
        expect(log.error).toHaveBeenCalledWith(
          'Failed to create MCP Optimizer workload',
          expect.objectContaining({
            message: expect.stringContaining('Failed to fetch'),
          })
        )
      })
    })

    it('verifies complete payload structure with recordRequests', async () => {
      // Initialize recordRequests first to capture all requests for this test
      const rec = recordRequests()

      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () =>
            HttpResponse.json({
              server: {
                image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                transport: 'streamable-http',
              },
            })
        ),
        http.get(mswEndpoint('/api/v1beta/groups'), () =>
          HttpResponse.json({
            groups: [
              {
                name: 'production',
                registered_clients: [],
              },
              {
                name: MCP_OPTIMIZER_GROUP_NAME,
                registered_clients: [],
              },
            ],
          })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () =>
          HttpResponse.json({
            name: META_MCP_SERVER_NAME,
            group: MCP_OPTIMIZER_GROUP_NAME,
          })
        )
      )

      const { Wrapper, queryClient } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      // Wait for queries to complete
      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0)
      })

      await result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'production',
        optimized_workloads: ['server1', 'server2'],
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Verify POST request with complete payload structure
      await waitFor(() => {
        const postRequest = rec.recordedRequests.find(
          (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
        )
        expect(postRequest).toBeDefined()
        expect(postRequest?.payload).toEqual({
          name: META_MCP_SERVER_NAME,
          image: 'ghcr.io/stackloklabs/meta-mcp:latest',
          transport: 'streamable-http',
          group: MCP_OPTIMIZER_GROUP_NAME,
          env_vars: {
            [ALLOWED_GROUPS_ENV_VAR]: 'production',
          },
          secrets: [],
          cmd_arguments: [],
          network_isolation: false,
          volumes: [],
        })
      })
    })

    it('verifies no extra fields are sent in payload', async () => {
      const rec = recordRequests()

      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () =>
            HttpResponse.json({
              server: {
                image: 'test-image',
                transport: 'sse',
              },
            })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () =>
          HttpResponse.json({ name: META_MCP_SERVER_NAME })
        )
      )

      const { Wrapper, queryClient } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      // Wait for registry server query to complete
      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0)
      })

      await result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'default',
        optimized_workloads: [],
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      const postRequest = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
      )

      // Verify exact keys in payload - no extra fields
      const payloadKeys = Object.keys(postRequest?.payload || {})

      // Expected keys when registry server data is available
      expect(payloadKeys).toContain('name')
      expect(payloadKeys).toContain('image')
      expect(payloadKeys).toContain('transport')
      expect(payloadKeys).toContain('group')
      expect(payloadKeys).toContain('env_vars')
      expect(payloadKeys).toContain('secrets')
      expect(payloadKeys).toContain('cmd_arguments')
      expect(payloadKeys).toContain('network_isolation')
      expect(payloadKeys).toContain('volumes')

      // Verify no extra fields beyond expected (9 on non-Linux)
      expect(payloadKeys.length).toBe(9)
    })

    it('verifies saveGroupClients is called with correct group', async () => {
      const mockSaveGroupClients = vi.fn().mockResolvedValue(undefined)

      vi.mocked(useMcpOptimizerClients).mockReturnValue({
        saveGroupClients: mockSaveGroupClients,
        restoreClientsToGroup: vi.fn().mockResolvedValue(undefined),
      })

      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () =>
            HttpResponse.json({
              server: {
                image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                transport: 'streamable-http',
              },
            })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () =>
          HttpResponse.json({
            name: META_MCP_SERVER_NAME,
            group: MCP_OPTIMIZER_GROUP_NAME,
          })
        )
      )

      const { Wrapper, queryClient } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0)
      })

      await result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'dev-team',
        optimized_workloads: ['server1', 'server2'],
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      // Verify that saveGroupClients was called with correct group
      await waitFor(() => {
        expect(mockSaveGroupClients).toHaveBeenCalledWith({
          groupName: 'dev-team',
        })
      })
    })

    it('includes host networking mode permission profile on Linux', async () => {
      Object.defineProperty(window, 'electronAPI', {
        value: { isLinux: true },
        writable: true,
        configurable: true,
      })

      const rec = recordRequests()

      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () =>
            HttpResponse.json({
              server: {
                image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                transport: 'streamable-http',
              },
            })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () =>
          HttpResponse.json({
            name: META_MCP_SERVER_NAME,
            group: MCP_OPTIMIZER_GROUP_NAME,
          })
        )
      )

      const { Wrapper, queryClient } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0)
      })

      await result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'test-group',
        optimized_workloads: [],
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      const postRequest = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
      )

      expect(postRequest?.payload).toEqual({
        name: META_MCP_SERVER_NAME,
        image: 'ghcr.io/stackloklabs/meta-mcp:latest',
        transport: 'streamable-http',
        group: MCP_OPTIMIZER_GROUP_NAME,
        env_vars: {
          [ALLOWED_GROUPS_ENV_VAR]: 'test-group',
          TOOLHIVE_HOST: '127.0.0.1',
        },
        secrets: [],
        cmd_arguments: [],
        network_isolation: false,
        volumes: [],
        permission_profile: {
          network: {
            mode: 'host',
          },
        },
      })
      expect(postRequest?.payload).toHaveProperty('permission_profile')
      expect(
        (postRequest?.payload as V1CreateRequest | undefined)?.env_vars
      ).toHaveProperty('TOOLHIVE_HOST', '127.0.0.1')
    })

    it('does not include permission profile on non-Linux platforms', async () => {
      const rec = recordRequests()

      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () =>
            HttpResponse.json({
              server: {
                image: 'ghcr.io/stackloklabs/meta-mcp:latest',
                transport: 'streamable-http',
              },
            })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () =>
          HttpResponse.json({
            name: META_MCP_SERVER_NAME,
            group: MCP_OPTIMIZER_GROUP_NAME,
          })
        )
      )

      const { Wrapper, queryClient } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0)
      })

      await result.current.handleCreateMetaOptimizerWorkload({
        groupToOptimize: 'test-group',
        optimized_workloads: [],
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      const postRequest = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
      )

      expect(postRequest?.payload).toEqual({
        name: META_MCP_SERVER_NAME,
        image: 'ghcr.io/stackloklabs/meta-mcp:latest',
        transport: 'streamable-http',
        group: MCP_OPTIMIZER_GROUP_NAME,
        env_vars: {
          [ALLOWED_GROUPS_ENV_VAR]: 'test-group',
        },
        secrets: [],
        cmd_arguments: [],
        network_isolation: false,
        volumes: [],
      })
      expect(postRequest?.payload).not.toHaveProperty('permission_profile')
      expect(
        (postRequest?.payload as V1CreateRequest | undefined)?.env_vars
      ).not.toHaveProperty('TOOLHIVE_HOST')
    })
  })
})
