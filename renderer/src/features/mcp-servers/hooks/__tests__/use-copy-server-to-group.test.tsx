import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCopyServerToGroup } from '../use-copy-server-to-group'
import { server as mswServer, recordRequests } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import type { RunnerRunConfig } from '@api/types.gen'

// Mock the usePrompt hook
vi.mock('@/common/hooks/use-prompt', () => ({
  usePrompt: () => vi.fn().mockResolvedValue({ value: 'test-server-copy' }),
  generateSimplePrompt: vi.fn(),
}))

const createWrapper = () => {
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

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCopyServerToGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Remote Server Copy', () => {
    it('should send url field (not image) when copying a remote server with no auth', async () => {
      const rec = recordRequests()
      const wrapper = createWrapper()

      // Mock the export endpoint to return a remote server configuration
      const remoteServerConfig: RunnerRunConfig = {
        name: 'mcp-shell',
        remote_url: 'http://127.0.0.1:8000/mcp',
        image: '', // Remote servers have empty image field
        transport: 'streamable-http',
        host: '127.0.0.1',
        target_port: 64341,
        env_vars: {
          FASTMCP_PORT: '64341',
          MCP_PORT: '64341',
          MCP_TRANSPORT: 'streamable-http',
        },
        secrets: [],
        remote_auth_config: {
          clientID: '',
          clientSecret: '',
          clientSecretFile: '',
          scopes: [],
          skipBrowser: false,
          timeout: '0',
          callbackPort: 4444,
          issuer: '',
          authorizeURL: '',
          tokenURL: '',
          headers: null,
          envVars: null,
          oauthParams: null,
        },
        permission_profile: {
          name: 'network',
          network: {
            outbound: {
              insecure_allow_all: true,
            },
          },
        },
        isolate_network: false,
        volumes: [],
        cmd_args: [],
      }

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/mcp-shell/export'), () => {
          return HttpResponse.json(remoteServerConfig)
        }),
        http.post(mswEndpoint('/api/v1beta/workloads'), () => {
          // After the fix, the backend should succeed
          return HttpResponse.json(
            { name: 'mcp-shell-test-group', port: 64341 },
            { status: 201 }
          )
        })
      )

      const { result } = renderHook(() => useCopyServerToGroup('mcp-shell'), {
        wrapper,
      })

      await act(async () => {
        result.current.copyServerToGroup('test-group', 'mcp-shell-test-group')
      })

      await waitFor(
        () => {
          const createWorkloadRequest = rec.recordedRequests.find(
            (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
          )

          expect(createWorkloadRequest).toBeDefined()

          // After the fix, remote servers should send url field
          expect(createWorkloadRequest?.payload).toMatchObject({
            name: 'mcp-shell-test-group',
            url: 'http://127.0.0.1:8000/mcp',
            transport: 'streamable-http',
            group: 'test-group',
          })

          // Should NOT have an image field for remote servers
          expect(createWorkloadRequest?.payload).not.toHaveProperty('image')
          expect(createWorkloadRequest?.payload).not.toHaveProperty('volumes')
          expect(createWorkloadRequest?.payload).not.toHaveProperty(
            'cmd_arguments'
          )
        },
        { timeout: 5000 }
      )
    })

    it('should send url field (not image) when copying a remote server (expected behavior after fix)', async () => {
      const rec = recordRequests()
      const wrapper = createWrapper()

      const remoteServerConfig: RunnerRunConfig = {
        name: 'mcp-shell',
        remote_url: 'http://127.0.0.1:8000/mcp',
        image: '',
        transport: 'streamable-http',
        host: '127.0.0.1',
        target_port: 64341,
        env_vars: {
          FASTMCP_PORT: '64341',
          MCP_PORT: '64341',
          MCP_TRANSPORT: 'streamable-http',
        },
        secrets: [],
        remote_auth_config: {
          clientID: 'test-client',
          clientSecret: '',
          clientSecretFile: '',
          scopes: ['openid', 'profile'],
          skipBrowser: false,
          timeout: '0',
          callbackPort: 4444,
          issuer: 'https://auth.example.com',
          authorizeURL: 'https://auth.example.com/authorize',
          tokenURL: 'https://auth.example.com/token',
          headers: null,
          envVars: null,
          oauthParams: { prompt: 'consent' },
        },
        permission_profile: {
          name: 'network',
          network: {
            outbound: {
              insecure_allow_all: true,
            },
          },
        },
        isolate_network: false,
        volumes: [],
        cmd_args: [],
      }

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/mcp-shell/export'), () => {
          return HttpResponse.json(remoteServerConfig)
        }),
        http.post(mswEndpoint('/api/v1beta/workloads'), () => {
          return HttpResponse.json(
            { name: 'mcp-shell-test-group', port: 64341 },
            { status: 201 }
          )
        })
      )

      const { result } = renderHook(() => useCopyServerToGroup('mcp-shell'), {
        wrapper,
      })

      await act(async () => {
        result.current.copyServerToGroup('test-group', 'mcp-shell-test-group')
      })

      await waitFor(
        () => {
          const createWorkloadRequest = rec.recordedRequests.find(
            (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
          )

          expect(createWorkloadRequest).toBeDefined()

          // After the fix, remote servers should send url field
          expect(createWorkloadRequest?.payload).toMatchObject({
            name: 'mcp-shell-test-group',
            url: 'http://127.0.0.1:8000/mcp',
            transport: 'streamable-http',
            group: 'test-group',
            oauth_config: {
              client_id: 'test-client',
              issuer: 'https://auth.example.com',
              authorize_url: 'https://auth.example.com/authorize',
              token_url: 'https://auth.example.com/token',
              scopes: ['openid', 'profile'],
              oauth_params: { prompt: 'consent' },
              skip_browser: false,
              use_pkce: true,
            },
          })

          // Should NOT have an image field for remote servers
          expect(createWorkloadRequest?.payload).not.toHaveProperty('image')
          expect(createWorkloadRequest?.payload).not.toHaveProperty('volumes')
        },
        { timeout: 5000 }
      )
    })
  })

  describe('Local Server Copy', () => {
    it('should send image field when copying a local (container) server', async () => {
      const rec = recordRequests()
      const wrapper = createWrapper()

      // Mock the export endpoint to return a local server configuration
      const localServerConfig: RunnerRunConfig = {
        name: 'local-server',
        image: 'mcp/filesystem:latest',
        remote_url: undefined, // Local servers don't have remote_url
        transport: 'stdio',
        host: '127.0.0.1',
        target_port: undefined,
        env_vars: {},
        secrets: [],
        permission_profile: {
          name: 'filesystem',
          read: ['/home/user/documents'],
        },
        isolate_network: false,
        volumes: ['/home/user/documents:/mnt/docs:ro'],
        cmd_args: ['--root', '/mnt/docs'],
      }

      mswServer.use(
        http.get(
          mswEndpoint('/api/v1beta/workloads/local-server/export'),
          () => {
            return HttpResponse.json(localServerConfig)
          }
        ),
        http.post(mswEndpoint('/api/v1beta/workloads'), () => {
          return HttpResponse.json(
            { name: 'local-server-test-group', port: 8080 },
            { status: 201 }
          )
        })
      )

      const { result } = renderHook(
        () => useCopyServerToGroup('local-server'),
        {
          wrapper,
        }
      )

      await act(async () => {
        result.current.copyServerToGroup(
          'test-group',
          'local-server-test-group'
        )
      })

      await waitFor(
        () => {
          const createWorkloadRequest = rec.recordedRequests.find(
            (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
          )

          expect(createWorkloadRequest).toBeDefined()

          // Local servers should send image field
          expect(createWorkloadRequest?.payload).toMatchObject({
            name: 'local-server-test-group',
            image: 'mcp/filesystem:latest',
            transport: 'stdio',
            group: 'test-group',
            volumes: ['/home/user/documents:/mnt/docs:ro'],
            cmd_arguments: ['--root', '/mnt/docs'],
          })

          // Should NOT have url field for local servers
          expect(createWorkloadRequest?.payload).not.toHaveProperty('url')
          expect(createWorkloadRequest?.payload).not.toHaveProperty(
            'oauth_config'
          )
        },
        { timeout: 5000 }
      )
    })
  })
})
