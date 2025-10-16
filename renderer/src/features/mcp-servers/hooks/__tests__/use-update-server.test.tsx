import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUpdateServer } from '../use-update-server'
import { server as mswServer, recordRequests } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import type { FormSchemaLocalMcp } from '../../lib/form-schema-local-mcp'
import {
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
} from '@api/@tanstack/react-query.gen'

// Mock the useLocation hook
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/test-path' }),
}))

const createWrapper = (groupName: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  // Pre-populate the query cache with workloads data
  const queryKey = getApiV1BetaWorkloadsQueryKey({
    query: { all: true, group: groupName },
  })
  queryClient.setQueryData(queryKey, {
    workloads: [],
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useUpdateServer', () => {
  beforeEach(() => {
    // Mock the queries that the hook depends on
    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/clients'), () => {
        return HttpResponse.json({ clients: [] })
      })
    )
  })

  describe('Remote Server', () => {
    it('updates a remote server without handling secrets', async () => {
      const rec = recordRequests()
      const wrapper = createWrapper('production')

      mswServer.use(
        http.post(mswEndpoint('/api/v1beta/workloads/:name/edit'), () => {
          return HttpResponse.json({ name: 'test-remote-server', port: 8080 })
        })
      )

      const { result } = renderHook(
        () =>
          useUpdateServer('test-remote-server', {
            isRemote: true,
            onSecretSuccess: vi.fn(),
            onSecretError: vi.fn(),
          }),
        { wrapper }
      )

      const formData: FormSchemaRemoteMcp = {
        name: 'test-remote-server',
        url: 'https://api.example.com',
        transport: 'streamable-http',
        auth_type: 'none',
        oauth_config: {
          authorize_url: '',
          callback_port: 8080,
          client_id: '',
          client_secret: undefined,
          issuer: '',
          oauth_params: {},
          scopes: '',
          skip_browser: false,
          token_url: '',
          use_pkce: true,
        },
        secrets: [],
        group: 'production',
      }

      await act(async () => {
        await result.current.updateServerMutation({ data: formData })
      })

      await waitFor(() => {
        const workloadRequest = rec.recordedRequests.find(
          (r) =>
            r.method === 'POST' &&
            r.pathname === '/api/v1beta/workloads/test-remote-server/edit'
        )

        expect(workloadRequest).toBeDefined()
        expect(workloadRequest?.payload).toMatchObject({
          group: 'production',
          name: 'test-remote-server',
        })
      })
    })

    it('sends correct auth_type for remote server with oauth2', async () => {
      const rec = recordRequests()
      const wrapper = createWrapper('development')

      mswServer.use(
        http.post(mswEndpoint('/api/v1beta/workloads/:name/edit'), () => {
          return HttpResponse.json({ name: 'test-oauth-server', port: 8080 })
        })
      )

      const { result } = renderHook(
        () =>
          useUpdateServer('test-oauth-server', {
            isRemote: true,
            onSecretSuccess: vi.fn(),
            onSecretError: vi.fn(),
          }),
        { wrapper }
      )

      const formData: FormSchemaRemoteMcp = {
        name: 'test-oauth-server',
        url: 'https://api.example.com',
        transport: 'streamable-http',
        auth_type: 'oauth2',
        oauth_config: {
          authorize_url: 'https://oauth.example.com/authorize',
          callback_port: 8080,
          client_id: 'test-client-id',
          client_secret: {
            name: 'CLIENT_SECRET',
            value: {
              secret: 'test-secret-key',
              isFromStore: false,
            },
          },
          issuer: 'https://oauth.example.com',
          oauth_params: { prompt: 'consent' },
          scopes: 'read write',
          skip_browser: false,
          token_url: 'https://oauth.example.com/token',
          use_pkce: true,
        },
        secrets: [],
        group: 'development',
      }

      await act(async () => {
        await result.current.updateServerMutation({ data: formData })
      })

      await waitFor(() => {
        const workloadRequest = rec.recordedRequests.find(
          (r) =>
            r.method === 'POST' &&
            r.pathname === '/api/v1beta/workloads/test-oauth-server/edit'
        )

        expect(workloadRequest).toBeDefined()
        expect(workloadRequest?.payload).toMatchObject({
          group: 'development',
          oauth_config: expect.objectContaining({
            client_id: 'test-client-id',
          }),
        })
      })
    })
  })

  describe('Local Server', () => {
    it('updates a local docker server and handles secrets', async () => {
      const rec = recordRequests()
      const onSecretSuccess = vi.fn()
      const wrapper = createWrapper('development')

      mswServer.use(
        http.post(
          mswEndpoint('/api/v1beta/secrets/default/keys'),
          async ({ request }) => {
            const body = (await request.json()) as { key: string }
            return HttpResponse.json({ key: body.key })
          }
        ),
        http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
          return HttpResponse.json({ keys: [] })
        }),
        http.post(mswEndpoint('/api/v1beta/workloads/:name/edit'), () => {
          return HttpResponse.json({ name: 'test-local-server', port: 8080 })
        })
      )

      const { result } = renderHook(
        () =>
          useUpdateServer('test-local-server', {
            isRemote: false,
            onSecretSuccess,
            onSecretError: vi.fn(),
          }),
        { wrapper }
      )

      const formData: FormSchemaLocalMcp = {
        name: 'test-local-server',
        transport: 'stdio',
        type: 'docker_image',
        image: 'test/image:latest',
        cmd_arguments: ['server.js'],
        envVars: [],
        secrets: [
          {
            name: 'API_KEY',
            value: {
              secret: 'secret-key-id',
              isFromStore: false,
            },
          },
        ],
        group: 'development',
        networkIsolation: false,
        allowedHosts: [],
        allowedPorts: [],
        volumes: [],
      }

      await act(async () => {
        await result.current.updateServerMutation({ data: formData })
      })

      await waitFor(() => {
        const secretRequest = rec.recordedRequests.find(
          (r) =>
            r.method === 'POST' &&
            r.pathname === '/api/v1beta/secrets/default/keys'
        )

        expect(secretRequest).toBeDefined()
        expect(onSecretSuccess).toHaveBeenCalled()
      })

      await waitFor(() => {
        const workloadRequest = rec.recordedRequests.find(
          (r) =>
            r.method === 'POST' &&
            r.pathname === '/api/v1beta/workloads/test-local-server/edit'
        )

        expect(workloadRequest).toBeDefined()
        expect(workloadRequest?.payload).toMatchObject({
          image: 'test/image:latest',
          group: 'development',
          transport: 'stdio',
        })
      })
    })

    it('updates a package manager server correctly', async () => {
      const rec = recordRequests()
      const wrapper = createWrapper('testing')

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
          return HttpResponse.json({ keys: [] })
        }),
        http.post(mswEndpoint('/api/v1beta/workloads/:name/edit'), () => {
          return HttpResponse.json({ name: 'test-npm-server', port: 8080 })
        })
      )

      const { result } = renderHook(
        () =>
          useUpdateServer('test-npm-server', {
            isRemote: false,
            onSecretSuccess: vi.fn(),
            onSecretError: vi.fn(),
          }),
        { wrapper }
      )

      const formData: FormSchemaLocalMcp = {
        name: 'test-npm-server',
        transport: 'stdio',
        type: 'package_manager',
        protocol: 'npx',
        package_name: '@modelcontextprotocol/server-example',
        cmd_arguments: ['index.js'],
        envVars: [],
        secrets: [],
        group: 'testing',
        networkIsolation: false,
        allowedHosts: [],
        allowedPorts: [],
        volumes: [],
      }

      await act(async () => {
        await result.current.updateServerMutation({ data: formData })
      })

      await waitFor(() => {
        const workloadRequest = rec.recordedRequests.find(
          (r) =>
            r.method === 'POST' &&
            r.pathname === '/api/v1beta/workloads/test-npm-server/edit'
        )

        expect(workloadRequest).toBeDefined()
        expect(workloadRequest?.payload).toMatchObject({
          image: 'npx://@modelcontextprotocol/server-example',
          group: 'testing',
          transport: 'stdio',
        })
      })
    })

    it('handles local server with no secrets', async () => {
      const rec = recordRequests()
      const wrapper = createWrapper('development')

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
          return HttpResponse.json({ keys: [] })
        }),
        http.post(mswEndpoint('/api/v1beta/workloads/:name/edit'), () => {
          return HttpResponse.json({ name: 'test-no-secrets', port: 8080 })
        })
      )

      const { result } = renderHook(
        () =>
          useUpdateServer('test-no-secrets', {
            isRemote: false,
            onSecretSuccess: vi.fn(),
            onSecretError: vi.fn(),
          }),
        { wrapper }
      )

      const formData: FormSchemaLocalMcp = {
        name: 'test-no-secrets',
        transport: 'stdio',
        type: 'docker_image',
        image: 'test/image:latest',
        cmd_arguments: [],
        envVars: [],
        secrets: [],
        group: 'development',
        networkIsolation: false,
        allowedHosts: [],
        allowedPorts: [],
        volumes: [],
      }

      await act(async () => {
        await result.current.updateServerMutation({ data: formData })
      })

      await waitFor(() => {
        const workloadRequest = rec.recordedRequests.find(
          (r) =>
            r.method === 'POST' &&
            r.pathname === '/api/v1beta/workloads/test-no-secrets/edit'
        )

        expect(workloadRequest).toBeDefined()
        // Should not have posted any secrets
        const secretRequests = rec.recordedRequests.filter(
          (r) => r.method === 'POST' && r.pathname.includes('/secrets/')
        )
        expect(secretRequests).toHaveLength(0)
      })
    })
  })

  describe('Type Safety', () => {
    it('correctly discriminates between local and remote data types', async () => {
      const wrapper = createWrapper('test-group')

      mswServer.use(
        http.post(mswEndpoint('/api/v1beta/workloads/:name/edit'), () => {
          return HttpResponse.json({ name: 'test-server', port: 8080 })
        })
      )

      const { result: remoteResult } = renderHook(
        () =>
          useUpdateServer('test-remote', {
            isRemote: true,
            onSecretSuccess: vi.fn(),
            onSecretError: vi.fn(),
          }),
        { wrapper }
      )

      const { result: localResult } = renderHook(
        () =>
          useUpdateServer('test-local', {
            isRemote: false,
            onSecretSuccess: vi.fn(),
            onSecretError: vi.fn(),
          }),
        { wrapper }
      )

      // Both hooks should return the same interface
      expect(remoteResult.current).toHaveProperty('updateServerMutation')
      expect(remoteResult.current).toHaveProperty('isPendingSecrets')
      expect(remoteResult.current).toHaveProperty('isErrorSecrets')

      expect(localResult.current).toHaveProperty('updateServerMutation')
      expect(localResult.current).toHaveProperty('isPendingSecrets')
      expect(localResult.current).toHaveProperty('isErrorSecrets')
    })
  })

  describe('Query Invalidation', () => {
    it('invalidates both old and new group queries when group changes', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })

      queryClient.setQueryData(
        getApiV1BetaWorkloadsQueryKey({
          query: { all: true, group: 'old-group' },
        }),
        { workloads: [] }
      )
      queryClient.setQueryData(
        getApiV1BetaWorkloadsQueryKey({
          query: { all: true, group: 'new-group' },
        }),
        { workloads: [] }
      )

      queryClient.setQueryData(
        getApiV1BetaWorkloadsByNameOptions({ path: { name: 'test-server' } })
          .queryKey,
        { name: 'test-server', group: 'old-group' }
      )

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
          return HttpResponse.json({ keys: [] })
        }),
        http.post(mswEndpoint('/api/v1beta/workloads/:name/edit'), () => {
          return HttpResponse.json({ name: 'test-server', port: 8080 })
        }),
        http.get(mswEndpoint('/api/v1beta/clients'), () => {
          return HttpResponse.json({ clients: [] })
        })
      )

      const { result } = renderHook(() => useUpdateServer('test-server', {}), {
        wrapper,
      })

      const formData: FormSchemaLocalMcp = {
        name: 'test-server',
        transport: 'stdio',
        type: 'docker_image',
        image: 'test/image:latest',
        cmd_arguments: [],
        envVars: [],
        secrets: [],
        group: 'new-group', // Changed from old-group to new-group
        networkIsolation: false,
        allowedHosts: [],
        allowedPorts: [],
        volumes: [],
      }

      await act(async () => {
        await result.current.updateServerMutation({ data: formData })
      })

      await waitFor(() => {
        // Should invalidate both the old and new group
        expect(invalidateQueriesSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: getApiV1BetaWorkloadsQueryKey({
              query: { all: true, group: 'old-group' },
            }),
          })
        )
        expect(invalidateQueriesSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: getApiV1BetaWorkloadsQueryKey({
              query: { all: true, group: 'new-group' },
            }),
          })
        )
      })
    })

    it('invalidates only one group query when group does not change', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })

      queryClient.setQueryData(
        getApiV1BetaWorkloadsQueryKey({
          query: { all: true, group: 'same-group' },
        }),
        { workloads: [] }
      )

      queryClient.setQueryData(
        getApiV1BetaWorkloadsByNameOptions({ path: { name: 'test-server' } })
          .queryKey,
        { name: 'test-server', group: 'same-group' }
      )

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
          return HttpResponse.json({ keys: [] })
        }),
        http.post(mswEndpoint('/api/v1beta/workloads/:name/edit'), () => {
          return HttpResponse.json({ name: 'test-server', port: 8080 })
        }),
        http.get(mswEndpoint('/api/v1beta/clients'), () => {
          return HttpResponse.json({ clients: [] })
        })
      )

      const { result } = renderHook(() => useUpdateServer('test-server', {}), {
        wrapper,
      })

      const formData: FormSchemaLocalMcp = {
        name: 'test-server',
        transport: 'stdio',
        type: 'docker_image',
        image: 'test/image:latest',
        cmd_arguments: [],
        envVars: [],
        secrets: [],
        group: 'same-group', // Same as original
        networkIsolation: false,
        allowedHosts: [],
        allowedPorts: [],
        volumes: [],
      }

      await act(async () => {
        await result.current.updateServerMutation({ data: formData })
      })

      await waitFor(() => {
        // Should only invalidate once (Set deduplicates)
        const invalidateCalls = invalidateQueriesSpy.mock.calls.filter(
          (call) => {
            const queryKey = call[0]?.queryKey
            return (
              queryKey &&
              JSON.stringify(queryKey) ===
                JSON.stringify(
                  getApiV1BetaWorkloadsQueryKey({
                    query: { all: true, group: 'same-group' },
                  })
                )
            )
          }
        )
        expect(invalidateCalls).toHaveLength(1)
      })
    })
  })
})
