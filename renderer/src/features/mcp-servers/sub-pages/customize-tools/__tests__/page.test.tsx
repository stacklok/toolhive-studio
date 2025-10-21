import { render, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { server as mswServer } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import type { CoreWorkload } from '@api/types.gen'
import * as orchestrateRunLocalServer from '@/features/mcp-servers/lib/orchestrate-run-local-server'
import * as orchestrateRunRemoteServer from '@/features/mcp-servers/lib/orchestrate-run-remote-server'
import * as useUpdateServerModule from '@/features/mcp-servers/hooks/use-update-server'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  Router,
  RouterProvider,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomizeToolsPage } from '../page'

const createLocalServerWorkload = (
  overrides: Partial<CoreWorkload> = {}
): CoreWorkload => ({
  name: 'test-local-server',
  package: 'ghcr.io/test/server:latest',
  transport_type: 'stdio',
  status: 'running',
  tools: ['tool1', 'tool2'],
  ...overrides,
})

const createRemoteServerWorkload = (
  overrides: Partial<CoreWorkload> = {}
): CoreWorkload => ({
  name: 'test-remote-server',
  url: 'https://api.example.com/mcp',
  transport_type: 'sse',
  status: 'running',
  remote: true,
  tools: ['remote-tool1', 'remote-tool2'],
  ...overrides,
})

const mockUpdateServerMutation = vi.fn()

const setupRouterWithPage = (serverName: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  const rootRoute = createRootRoute({
    component: Outlet,
  })

  const customizeToolsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/customize-tools/$serverName',
    component: CustomizeToolsPage,
  })

  const router = new Router({
    routeTree: rootRoute.addChildren([customizeToolsRoute]),
    history: createMemoryHistory({
      initialEntries: [`/customize-tools/${serverName}`],
    }),
  })

  return { queryClient, router }
}

describe('Customize Tools Page - Converter Function Selection', () => {
  beforeEach(() => {
    vi.spyOn(useUpdateServerModule, 'useUpdateServer').mockReturnValue({
      updateServerMutation: mockUpdateServerMutation,
      isPendingSecrets: false,
      isErrorSecrets: false,
    })
  })

  afterEach(() => {
    mswServer.resetHandlers()
    vi.clearAllMocks()
  })

  describe('Local Server (container-based)', () => {
    it('should use convertLocalServerToFormData for local servers when rendering page', async () => {
      const convertLocalSpy = vi.spyOn(
        orchestrateRunLocalServer,
        'convertCreateRequestToFormData'
      )
      const convertRemoteSpy = vi.spyOn(
        orchestrateRunRemoteServer,
        'convertCreateRequestToFormData'
      )

      const localWorkload = createLocalServerWorkload({
        package: 'ghcr.io/test/server:latest',
      })

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads'), () => {
          return HttpResponse.json({
            workloads: [localWorkload],
          })
        }),
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json({
            ...localWorkload,
            image: localWorkload.package,
          })
        }),
        http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
          return HttpResponse.json({ keys: [] })
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            servers: [
              {
                image: 'ghcr.io/test/server:latest',
                tools: ['tool1', 'tool2'],
              },
            ],
          })
        })
      )

      Object.defineProperty(window, 'electronAPI', {
        value: {
          utils: {
            getWorkloadAvailableTools: vi.fn().mockResolvedValue({
              tool1: { description: 'Tool 1' },
              tool2: { description: 'Tool 2' },
            }),
          },
        },
        writable: true,
      })

      const { queryClient, router } = setupRouterWithPage('test-local-server')
      const user = userEvent.setup()

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(
          screen.getByText('Customize Tools for test-local-server')
        ).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('tool1')).toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', {
        name: /apply/i,
      })
      await user.click(applyButton)

      await waitFor(() => {
        expect(convertLocalSpy).toHaveBeenCalled()
      })
      expect(convertRemoteSpy).not.toHaveBeenCalled()

      convertLocalSpy.mockRestore()
      convertRemoteSpy.mockRestore()
    })
  })

  describe('Remote Server', () => {
    it('should use convertRemoteServerToFormData for remote servers when rendering page', async () => {
      const convertLocalSpy = vi.spyOn(
        orchestrateRunLocalServer,
        'convertCreateRequestToFormData'
      )
      const convertRemoteSpy = vi.spyOn(
        orchestrateRunRemoteServer,
        'convertCreateRequestToFormData'
      )

      const remoteWorkload = createRemoteServerWorkload({
        url: 'https://api.example.com/mcp',
      })

      mswServer.use(
        http.get(mswEndpoint('/api/v1beta/workloads'), () => {
          return HttpResponse.json({
            workloads: [remoteWorkload],
          })
        }),
        http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
          return HttpResponse.json(remoteWorkload)
        }),
        http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
          return HttpResponse.json({ keys: [] })
        }),
        http.get(mswEndpoint('/api/v1beta/registry/:name/servers'), () => {
          return HttpResponse.json({
            remote_servers: [
              {
                url: 'https://api.example.com/mcp',
                tools: ['remote-tool1', 'remote-tool2'],
              },
            ],
          })
        })
      )

      Object.defineProperty(window, 'electronAPI', {
        value: {
          utils: {
            getWorkloadAvailableTools: vi.fn().mockResolvedValue({
              'remote-tool1': { description: 'Remote Tool 1' },
              'remote-tool2': { description: 'Remote Tool 2' },
            }),
          },
        },
        writable: true,
      })

      const { queryClient, router } = setupRouterWithPage('test-remote-server')
      const user = userEvent.setup()

      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(
          screen.getByText('Customize Tools for test-remote-server')
        ).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('remote-tool1')).toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', {
        name: /apply/i,
      })
      await user.click(applyButton)

      await waitFor(() => {
        expect(convertRemoteSpy).toHaveBeenCalled()
      })
      expect(convertLocalSpy).not.toHaveBeenCalled()

      convertLocalSpy.mockRestore()
      convertRemoteSpy.mockRestore()
    })
  })

  describe('Converter Selection Logic', () => {
    it('should correctly identify remote server by url presence', () => {
      const remoteWorkload = createRemoteServerWorkload()
      const localWorkload = createLocalServerWorkload()

      const isRemoteServer = (workload: CoreWorkload) => !!workload.url

      expect(isRemoteServer(remoteWorkload)).toBe(true)
      expect(isRemoteServer(localWorkload)).toBe(false)
    })

    it('should handle edge case where both url and package might exist', () => {
      const mixedWorkload = {
        ...createLocalServerWorkload(),
        url: 'https://api.example.com/mcp',
      }

      const isRemoteServer = !!mixedWorkload.url
      expect(isRemoteServer).toBe(true) // url takes precedence
    })
  })
})
