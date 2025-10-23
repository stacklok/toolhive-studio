import { renderHook, waitFor, act } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useCreateOptimizerWorkload } from '../use-create-optimizer-workload'
import { server } from '@/common/mocks/node'
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

vi.mock('../use-feature-flag')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn((promise) => promise),
  },
}))

vi.mock('electron-log/renderer', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

const { useFeatureFlag } = await import('../use-feature-flag')

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

  describe('when feature flags are disabled', () => {
    it('returns isNotEnabled as true when EXPERIMENTAL_FEATURES is disabled', async () => {
      vi.mocked(useFeatureFlag).mockImplementation((key) => {
        if (key === 'experimental_features') return false
        if (key === 'meta_optimizer') return true
        return false
      })

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      expect(result.current.isNotEnabled).toBe(true)
    })

    it('returns isNotEnabled as true when META_OPTIMIZER is disabled', async () => {
      vi.mocked(useFeatureFlag).mockImplementation((key) => {
        if (key === 'experimental_features') return true
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

      await act(async () => {
        await result.current.handleCreateMetaOptimizerWorkload('default')
      })

      expect(toast.success).not.toHaveBeenCalled()
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe('when feature flags are enabled', () => {
    beforeEach(() => {
      vi.mocked(useFeatureFlag).mockReturnValue(true)
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
        http.post(mswEndpoint('/api/v1beta/workloads'), async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          expect(body.name).toBe(META_MCP_SERVER_NAME)
          expect(body.image).toBe('ghcr.io/stackloklabs/meta-mcp:latest')
          expect(body.transport).toBe('streamable-http')
          expect(body.group).toBe(MCP_OPTIMIZER_GROUP_NAME)
          expect(body.env_vars).toEqual({
            [ALLOWED_GROUPS_ENV_VAR]: 'test-group',
          })
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

      await act(async () => {
        await result.current.handleCreateMetaOptimizerWorkload('test-group')
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
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

      await act(async () => {
        await result.current
          .handleCreateMetaOptimizerWorkload('test-group')
          .catch(() => {
            // Expected error, ignore
          })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to create MCP Optimizer workload'
        )
      })

      expect(log.error).toHaveBeenCalledWith(
        'Failed to create MCP Optimizer workload',
        expect.objectContaining({ error: 'Failed to create workload' })
      )
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

      act(() => {
        result.current.handleCreateMetaOptimizerWorkload('test-group')
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
      server.use(
        http.get(
          mswEndpoint('/api/v1beta/registry/:name/servers/:serverName'),
          () => HttpResponse.json({ server: null })
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          // Should still create workload but with undefined image/transport
          expect(body.name).toBe(META_MCP_SERVER_NAME)
          expect(body.group).toBe(MCP_OPTIMIZER_GROUP_NAME)
          expect(body.image).toBeUndefined()
          expect(body.transport).toBeUndefined()
          expect(body.env_vars).toEqual({
            [ALLOWED_GROUPS_ENV_VAR]: 'test-group',
          })
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

      await act(async () => {
        await result.current.handleCreateMetaOptimizerWorkload('test-group')
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      expect(toast.success).toHaveBeenCalledWith(
        'MCP Optimizer installed and running'
      )
    })

    it('passes correct group name in env_vars when creating workload', async () => {
      const testGroups = ['default', 'research', 'production']

      for (const groupName of testGroups) {
        vi.clearAllMocks()

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
          http.post(
            mswEndpoint('/api/v1beta/workloads'),
            async ({ request }) => {
              const body = await request.json()
              expect(body).toMatchObject({
                env_vars: { [ALLOWED_GROUPS_ENV_VAR]: groupName },
              })
              return HttpResponse.json({
                name: META_MCP_SERVER_NAME,
                group: MCP_OPTIMIZER_GROUP_NAME,
              })
            }
          )
        )

        const { Wrapper } = createQueryClientWrapper()
        const { result } = renderHook(() => useCreateOptimizerWorkload(), {
          wrapper: Wrapper,
        })

        await waitFor(() => {
          expect(result.current.isNotEnabled).toBe(false)
        })

        await act(async () => {
          await result.current.handleCreateMetaOptimizerWorkload(groupName)
        })

        await waitFor(() => {
          expect(result.current.isPending).toBe(false)
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
        http.post(mswEndpoint('/api/v1beta/workloads'), () =>
          HttpResponse.error()
        )
      )

      const { Wrapper } = createQueryClientWrapper()
      const { result } = renderHook(() => useCreateOptimizerWorkload(), {
        wrapper: Wrapper,
      })

      expect(result.current.isNotEnabled).toBe(false)

      await act(async () => {
        await result.current
          .handleCreateMetaOptimizerWorkload('test-group')
          .catch(() => {
            // Expected error, ignore
          })
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to create MCP Optimizer workload'
        )
      })

      expect(log.error).toHaveBeenCalledWith(
        'Failed to create MCP Optimizer workload',
        expect.objectContaining({
          message: expect.stringContaining('Failed to fetch'),
        })
      )
    })
  })
})
