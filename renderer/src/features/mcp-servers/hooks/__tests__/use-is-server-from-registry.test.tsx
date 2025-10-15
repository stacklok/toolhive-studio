import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useIsServerFromRegistry } from '../use-is-server-from-registry'
import { server as mswServer } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import type { V1CreateRequest, RegistryImageMetadata } from '@api/types.gen'

const createWorkload = (
  overrides: Partial<V1CreateRequest> = {}
): V1CreateRequest => {
  return {
    name: 'test-server',
    image: 'ghcr.io/test/server:latest',
    transport: 'stdio',
    ...overrides,
  }
}

const createRegistryImage = (
  overrides: Partial<RegistryImageMetadata> = {}
): RegistryImageMetadata => ({
  name: 'Test Server',
  image: 'ghcr.io/test/server:latest',
  description: 'A test server',
  transport: 'stdio',
  tools: [],
  env_vars: [],
  args: [],
  ...overrides,
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useIsServerFromRegistry', () => {
  beforeEach(() => {
    mswServer.resetHandlers()
  })

  describe('Server from registry', () => {
    it('identifies a server from registry with matching image and tools', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/server:v1.0.0' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                image: 'ghcr.io/test/server:v1.0.0',
                tools: ['tool1', 'tool2', 'tool3'],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        expect(result.current.registryTools).toEqual([
          'tool1',
          'tool2',
          'tool3',
        ])
        expect(result.current.drift).toBeNull()
      })
    })

    it('identifies a server from registry even with different tags', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/server:v1.0.0' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                image: 'ghcr.io/test/server:v2.0.0',
                tools: ['tool1', 'tool2'],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        expect(result.current.registryTools).toEqual(['tool1', 'tool2'])
        expect(result.current.drift).toEqual({
          localTag: 'v1.0.0',
          registryTag: 'v2.0.0',
        })
      })
    })

    it('identifies a server from registry with image without tag', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/server' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                image: 'ghcr.io/test/server:latest',
                tools: ['tool1'],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        expect(result.current.registryTools).toEqual(['tool1'])
        expect(result.current.drift).toEqual({
          localTag: '',
          registryTag: 'latest',
        })
      })
    })

    it('returns no drift when tags match', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/server:latest' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                image: 'ghcr.io/test/server:latest',
                tools: ['tool1', 'tool2'],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        expect(result.current.drift).toBeNull()
      })
    })
  })

  describe('Server not from registry', () => {
    it('returns false when image does not match any registry server', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/different-server:v1.0.0' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                image: 'ghcr.io/test/server:v1.0.0',
                tools: ['tool1', 'tool2'],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        expect(result.current.registryTools).toEqual([])
      })
    })

    it('returns false when matched registry item has no tools', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/server:v1.0.0' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                image: 'ghcr.io/test/server:v1.0.0',
                tools: [],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        expect(result.current.registryTools).toEqual([])
        expect(result.current.drift).toBeNull()
      })
    })

    it('returns false when matched registry item has undefined tools', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/server:v1.0.0' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                image: 'ghcr.io/test/server:v1.0.0',
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        expect(result.current.registryTools).toEqual([])
        expect(result.current.drift).toBeNull()
      })
    })

    it('returns false when serverName is empty', async () => {
      const wrapper = createWrapper()

      const { result } = renderHook(() => useIsServerFromRegistry(''), {
        wrapper,
      })

      expect(result.current.isFromRegistry).toBe(false)
      expect(result.current.registryTools).toEqual([])
    })

    it('returns false when workload has no image', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(createWorkload({ image: '' }))
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                image: 'ghcr.io/test/server:v1.0.0',
                tools: ['tool1'],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        expect(result.current.registryTools).toEqual([])
      })
    })

    it('returns false when registry has no servers', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/server:v1.0.0' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        expect(result.current.registryTools).toEqual([])
        // Drift is not meaningful when server is not from registry
      })
    })
  })

  describe('Multiple registry servers', () => {
    it('finds the correct server among multiple registry items', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/server-b:v1.0.0' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                name: 'Server A',
                image: 'ghcr.io/test/server-a:v1.0.0',
                tools: ['tool-a'],
              }),
              createRegistryImage({
                name: 'Server B',
                image: 'ghcr.io/test/server-b:v2.0.0',
                tools: ['tool-b1', 'tool-b2'],
              }),
              createRegistryImage({
                name: 'Server C',
                image: 'ghcr.io/test/server-c:v1.0.0',
                tools: ['tool-c'],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        expect(result.current.registryTools).toEqual(['tool-b1', 'tool-b2'])
        expect(result.current.drift).toEqual({
          localTag: 'v1.0.0',
          registryTag: 'v2.0.0',
        })
      })
    })

    it('matches only the first server when multiple have same image name', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/server:v1.0.0' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                name: 'Server First',
                image: 'ghcr.io/test/server:v1.0.0',
                tools: ['tool1', 'tool2'],
              }),
              createRegistryImage({
                name: 'Server Second',
                image: 'ghcr.io/test/server:v2.0.0',
                tools: ['tool3', 'tool4'],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        // Should match the first server
        expect(result.current.registryTools).toEqual(['tool1', 'tool2'])
        expect(result.current.drift).toBeNull()
      })
    })
  })

  describe('Edge cases', () => {
    it('handles image with multiple colons correctly', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'registry.io:5000/test/server:v1.0.0' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                image: 'registry.io:5000/test/server:v1.0.0',
                tools: ['tool1'],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        expect(result.current.registryTools).toEqual(['tool1'])
        expect(result.current.drift).toBeNull()
      })
    })

    it('handles query loading states gracefully', async () => {
      const wrapper = createWrapper()

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      expect(result.current.isFromRegistry).toBe(false)
      expect(result.current.registryTools).toEqual([])
    })

    it('detects drift even when registry tools exist but tags differ', async () => {
      const wrapper = createWrapper()

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(
            createWorkload({ image: 'ghcr.io/test/server:v1.0.0-beta' })
          )
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              createRegistryImage({
                image: 'ghcr.io/test/server:v2.0.0-stable',
                tools: ['tool1', 'tool2'],
              }),
            ],
          })
        })
      )

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        expect(result.current.drift).toEqual({
          localTag: 'v1.0.0-beta',
          registryTag: 'v2.0.0-stable',
        })
      })
    })
  })
})
