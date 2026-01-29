import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useIsServerFromRegistry } from '../use-is-server-from-registry'
import { mockedGetApiV1BetaWorkloadsByName } from '@mocks/fixtures/workloads_name/get'
import { mockedGetApiV1BetaRegistryByNameServers } from '@mocks/fixtures/registry_name_servers/get'
import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
  CoreWorkload,
} from '@common/api/generated/types.gen'

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

const createRemoteWorkload = (
  overrides: Partial<CoreWorkload> = {}
): CoreWorkload => ({
  name: 'test-remote-server',
  url: 'https://api.example.com/mcp',
  remote: true,
  transport_type: 'sse',
  tools: [],
  ...overrides,
})

const createRegistryRemoteServer = (
  overrides: Partial<RegistryRemoteServerMetadata> = {}
): RegistryRemoteServerMetadata => ({
  name: 'Test Remote Server',
  url: 'https://api.example.com/mcp',
  description: 'A test remote server',
  transport: 'sse',
  tools: [],
  env_vars: [],
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
  describe('Server from registry', () => {
    it('identifies a server from registry with matching image and tools', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1', 'tool2', 'tool3'],
          }),
        ],
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v2.0.0',
            tools: ['tool1', 'tool2'],
          }),
        ],
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:latest',
            tools: ['tool1'],
          }),
        ],
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:latest',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:latest',
            tools: ['tool1', 'tool2'],
          }),
        ],
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/different-server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1', 'tool2'],
          }),
        ],
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: [],
          }),
        ],
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
          }),
        ],
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: '',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1'],
          }),
        ],
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [],
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server-b:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
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
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
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
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'registry.io:5000/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'registry.io:5000/test/server:v1.0.0',
            tools: ['tool1'],
          }),
        ],
      }))

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

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0-beta',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v2.0.0-stable',
            tools: ['tool1', 'tool2'],
          }),
        ],
      }))

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

  describe('getToolsDiffFromRegistry', () => {
    it('returns hasExactMatch true when tools match exactly in same order', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1', 'tool2', 'tool3'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'tool1',
          'tool2',
          'tool3',
        ])
        expect(diff).toEqual({
          hasExactMatch: true,
          addedTools: [],
          missingTools: [],
        })
      })
    })

    it('returns hasExactMatch true when tools match but in different order', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1', 'tool2', 'tool3'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'tool3',
          'tool1',
          'tool2',
        ])
        expect(diff).toEqual({
          hasExactMatch: true,
          addedTools: [],
          missingTools: [],
        })
      })
    })

    it('does not mutate the original tools array', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1', 'tool2', 'tool3'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
      })

      const originalTools = ['tool3', 'tool1', 'tool2']
      const originalCopy = [...originalTools]

      result.current.getToolsDiffFromRegistry(originalTools)

      // Verify the original array was not mutated
      expect(originalTools).toEqual(originalCopy)
    })

    it('identifies added tools in server', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1', 'tool2'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'tool1',
          'tool2',
          'tool3',
          'tool4',
        ])
        expect(diff).toEqual({
          hasExactMatch: false,
          addedTools: ['tool3', 'tool4'],
          missingTools: [],
        })
      })
    })

    it('identifies missing tools from server', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1', 'tool2', 'tool3', 'tool4'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry(['tool1', 'tool2'])
        expect(diff).toEqual({
          hasExactMatch: false,
          addedTools: [],
          missingTools: ['tool3', 'tool4'],
        })
      })
    })

    it('identifies both added and missing tools', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1', 'tool2', 'tool3'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'tool1',
          'tool4',
          'tool5',
        ])
        expect(diff).toEqual({
          hasExactMatch: false,
          addedTools: ['tool4', 'tool5'],
          missingTools: ['tool2', 'tool3'],
        })
      })
    })

    it('returns null when registry item has no tools', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: [],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        const diff = result.current.getToolsDiffFromRegistry(['tool1'])
        expect(diff).toBeNull()
      })
    })

    it('returns null when server is not from registry', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/different-server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1', 'tool2'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        const diff = result.current.getToolsDiffFromRegistry(['tool1', 'tool2'])
        expect(diff).toBeNull()
      })
    })

    it('handles duplicate tools correctly', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['tool1', 'tool2', 'tool2'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        // With duplicates, the diff uses Set logic and deduplicates
        const diff = result.current.getToolsDiffFromRegistry([
          'tool1',
          'tool2',
          'tool3',
          'tool3',
        ])
        expect(diff).toEqual({
          hasExactMatch: false,
          addedTools: ['tool3'],
          missingTools: [],
        })
      })
    })

    it('preserves order of tools in the result', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override((data) => ({
        ...data,
        image: 'ghcr.io/test/server:v1.0.0',
      }))
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['alpha', 'beta', 'gamma'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'zebra',
          'alpha',
          'delta',
        ])
        // Should preserve the order they appear in the original arrays
        expect(diff).toEqual({
          hasExactMatch: false,
          addedTools: ['zebra', 'delta'],
          missingTools: ['beta', 'gamma'],
        })
      })
    })
  })

  describe('Remote servers from registry', () => {
    it('identifies a remote server from registry with matching URL', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1', 'remote-tool2'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        expect(result.current.registryTools).toEqual([
          'remote-tool1',
          'remote-tool2',
        ])
        // Remote servers should not have drift (no image tags)
        expect(result.current.drift).toBeNull()
      })
    })

    it('does not match remote server when URL is different', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.different.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        expect(result.current.registryTools).toEqual([])
      })
    })

    it('finds the correct remote server among multiple registry items', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.server-b.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            name: 'Remote Server A',
            url: 'https://api.server-a.com/mcp',
            tools: ['tool-a'],
          }),
          createRegistryRemoteServer({
            name: 'Remote Server B',
            url: 'https://api.server-b.com/mcp',
            tools: ['tool-b1', 'tool-b2'],
          }),
          createRegistryRemoteServer({
            name: 'Remote Server C',
            url: 'https://api.server-c.com/mcp',
            tools: ['tool-c'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        expect(result.current.registryTools).toEqual(['tool-b1', 'tool-b2'])
        expect(result.current.drift).toBeNull()
      })
    })

    it('returns false when remote server has no tools', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: [],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        expect(result.current.registryTools).toEqual([])
        expect(result.current.drift).toBeNull()
      })
    })

    it('works with getToolsDiffFromRegistry for remote servers', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1', 'remote-tool2', 'remote-tool3'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'remote-tool1',
          'remote-tool4',
        ])
        expect(diff).toEqual({
          hasExactMatch: false,
          addedTools: ['remote-tool4'],
          missingTools: ['remote-tool2', 'remote-tool3'],
        })
      })
    })

    it('handles both remote and container servers in registry', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        servers: [
          createRegistryImage({
            image: 'ghcr.io/test/server:v1.0.0',
            tools: ['container-tool1'],
          }),
        ],
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        // Should match the remote server, not the container server
        expect(result.current.registryTools).toEqual(['remote-tool1'])
        expect(result.current.drift).toBeNull()
      })
    })

    it('URL match must be exact (case-sensitive)', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.Example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        expect(result.current.registryTools).toEqual([])
      })
    })
  })

  describe('getToolsDiffFromRegistry for remote servers', () => {
    it('returns exact match for remote server with same tools', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1', 'remote-tool2', 'remote-tool3'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'remote-tool1',
          'remote-tool2',
          'remote-tool3',
        ])
        expect(diff).toEqual({
          hasExactMatch: true,
          addedTools: [],
          missingTools: [],
        })
      })
    })

    it('returns exact match for remote server with tools in different order', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1', 'remote-tool2', 'remote-tool3'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'remote-tool3',
          'remote-tool1',
          'remote-tool2',
        ])
        expect(diff).toEqual({
          hasExactMatch: true,
          addedTools: [],
          missingTools: [],
        })
      })
    })

    it('identifies added tools in remote server', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1', 'remote-tool2'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'remote-tool1',
          'remote-tool2',
          'remote-tool3',
          'remote-tool4',
        ])
        expect(diff).toEqual({
          hasExactMatch: false,
          addedTools: ['remote-tool3', 'remote-tool4'],
          missingTools: [],
        })
      })
    })

    it('identifies missing tools from remote server', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: [
              'remote-tool1',
              'remote-tool2',
              'remote-tool3',
              'remote-tool4',
            ],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'remote-tool1',
          'remote-tool2',
        ])
        expect(diff).toEqual({
          hasExactMatch: false,
          addedTools: [],
          missingTools: ['remote-tool3', 'remote-tool4'],
        })
      })
    })

    it('identifies both added and missing tools for remote server', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1', 'remote-tool2', 'remote-tool3'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'remote-tool1',
          'remote-tool4',
          'remote-tool5',
        ])
        expect(diff).toEqual({
          hasExactMatch: false,
          addedTools: ['remote-tool4', 'remote-tool5'],
          missingTools: ['remote-tool2', 'remote-tool3'],
        })
      })
    })

    it('handles duplicate tools correctly for remote server', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.example.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1', 'remote-tool2', 'remote-tool2'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(true)
        const diff = result.current.getToolsDiffFromRegistry([
          'remote-tool1',
          'remote-tool2',
          'remote-tool3',
          'remote-tool3',
        ])
        expect(diff).toEqual({
          hasExactMatch: false,
          addedTools: ['remote-tool3'],
          missingTools: [],
        })
      })
    })

    it('returns null when remote server is not from registry', async () => {
      const wrapper = createWrapper()

      mockedGetApiV1BetaWorkloadsByName.override(() =>
        createRemoteWorkload({
          url: 'https://api.different.com/mcp',
        })
      )
      mockedGetApiV1BetaRegistryByNameServers.override(() => ({
        remote_servers: [
          createRegistryRemoteServer({
            url: 'https://api.example.com/mcp',
            tools: ['remote-tool1', 'remote-tool2'],
          }),
        ],
      }))

      const { result } = renderHook(
        () => useIsServerFromRegistry('test-remote-server'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isFromRegistry).toBe(false)
        const diff = result.current.getToolsDiffFromRegistry([
          'remote-tool1',
          'remote-tool2',
        ])
        expect(diff).toBeNull()
      })
    })
  })
})
