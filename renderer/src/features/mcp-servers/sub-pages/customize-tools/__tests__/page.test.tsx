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
import * as useMutationRestartServerModule from '@/features/mcp-servers/hooks/use-mutation-restart-server'
import * as analytics from '@/common/lib/analytics'
import { toast } from 'sonner'
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

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
  },
}))

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

describe('Customize Tools Page - Server Not Running', () => {
  const mockRestartServer = vi.fn()
  const trackEventSpy = vi.spyOn(analytics, 'trackEvent')

  beforeEach(() => {
    vi.spyOn(useUpdateServerModule, 'useUpdateServer').mockReturnValue({
      updateServerMutation: mockUpdateServerMutation,
      isPendingSecrets: false,
      isErrorSecrets: false,
    })

    vi.spyOn(
      useMutationRestartServerModule,
      'useMutationRestartServer'
    ).mockReturnValue({
      mutateAsync: mockRestartServer,
      isPending: false,
      isIdle: true,
      isError: false,
      isSuccess: false,
      status: 'idle',
      error: null,
      data: undefined,
      variables: undefined,
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    })
  })

  afterEach(() => {
    mswServer.resetHandlers()
    vi.clearAllMocks()
  })

  it('should show EmptyState when server status is not running', async () => {
    const stoppedWorkload = createLocalServerWorkload({
      status: 'stopped',
    })

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json({
          workloads: [stoppedWorkload],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          ...stoppedWorkload,
          image: stoppedWorkload.package,
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

    const { queryClient, router } = setupRouterWithPage('test-local-server')

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Server is not running')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        /We can't retrieve the running tools with their names and descriptions/i
      )
    ).toBeInTheDocument()
  })

  it('should show Start Server button when server is not running', async () => {
    const stoppedWorkload = createLocalServerWorkload({
      status: 'stopped',
    })

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json({
          workloads: [stoppedWorkload],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          ...stoppedWorkload,
          image: stoppedWorkload.package,
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

    const { queryClient, router } = setupRouterWithPage('test-local-server')

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Start Server/i })
      ).toBeInTheDocument()
    })
  })

  it('should show Cancel button when server is not running', async () => {
    const stoppedWorkload = createLocalServerWorkload({
      status: 'stopped',
    })

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json({
          workloads: [stoppedWorkload],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          ...stoppedWorkload,
          image: stoppedWorkload.package,
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

    const { queryClient, router } = setupRouterWithPage('test-local-server')

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Cancel/i })
      ).toBeInTheDocument()
    })
  })

  it('should call restartServer when Start Server button is clicked', async () => {
    const stoppedWorkload = createLocalServerWorkload({
      status: 'stopped',
      group: 'test-group',
    })

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json({
          workloads: [stoppedWorkload],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          ...stoppedWorkload,
          image: stoppedWorkload.package,
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

    mockRestartServer.mockImplementation((_, options) => {
      options?.onSuccess?.()
      return Promise.resolve()
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
        screen.getByRole('button', { name: /Start Server/i })
      ).toBeInTheDocument()
    })

    const startButton = screen.getByRole('button', { name: /Start Server/i })
    await user.click(startButton)

    await waitFor(() => {
      expect(mockRestartServer).toHaveBeenCalledWith(
        { path: { name: 'test-local-server' } },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      )
    })
  })

  it('should track analytics event when Start Server button is clicked', async () => {
    const stoppedWorkload = createLocalServerWorkload({
      status: 'stopped',
    })

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json({
          workloads: [stoppedWorkload],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          ...stoppedWorkload,
          image: stoppedWorkload.package,
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

    const { queryClient, router } = setupRouterWithPage('test-local-server')
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Start Server/i })
      ).toBeInTheDocument()
    })

    const startButton = screen.getByRole('button', { name: /Start Server/i })
    await user.click(startButton)

    await waitFor(() => {
      expect(trackEventSpy).toHaveBeenCalledWith(
        'Customize Tools: Server not running click start server',
        {
          server_name: 'test-local-server',
        }
      )
    })
  })

  it('should show error toast when server fails to start', async () => {
    const stoppedWorkload = createLocalServerWorkload({
      status: 'stopped',
    })

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json({
          workloads: [stoppedWorkload],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          ...stoppedWorkload,
          image: stoppedWorkload.package,
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

    mockRestartServer.mockImplementation((_, options) => {
      options?.onError?.()
      return Promise.reject(new Error('Failed to start'))
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
        screen.getByRole('button', { name: /Start Server/i })
      ).toBeInTheDocument()
    })

    const startButton = screen.getByRole('button', { name: /Start Server/i })
    await user.click(startButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to start server for test-local-server'
      )
    })
  })

  it('should disable Start Server button when isPending is true', async () => {
    const stoppedWorkload = createLocalServerWorkload({
      status: 'stopped',
    })

    vi.spyOn(
      useMutationRestartServerModule,
      'useMutationRestartServer'
    ).mockReturnValue({
      mutateAsync: mockRestartServer,
      isPending: true,
      isIdle: false,
      isError: false,
      isSuccess: false,
      status: 'pending',
      error: null,
      data: undefined,
      variables: { path: { name: 'test-local-server' } },
      reset: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: Date.now(),
    })

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json({
          workloads: [stoppedWorkload],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          ...stoppedWorkload,
          image: stoppedWorkload.package,
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

    const { queryClient, router } = setupRouterWithPage('test-local-server')

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /Starting.../i })
      expect(startButton).toBeInTheDocument()
      expect(startButton).toBeDisabled()
    })
  })

  it('should navigate to group page when Cancel button is clicked', async () => {
    const stoppedWorkload = createLocalServerWorkload({
      status: 'stopped',
      group: 'test-group',
    })

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json({
          workloads: [stoppedWorkload],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          ...stoppedWorkload,
          image: stoppedWorkload.package,
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

    const { queryClient, router } = setupRouterWithPage('test-local-server')
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Cancel/i })
      ).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/group/test-group')
    })
  })

  it('should not show CustomizeToolsTable when server is not running', async () => {
    const stoppedWorkload = createLocalServerWorkload({
      status: 'stopped',
    })

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json({
          workloads: [stoppedWorkload],
        })
      }),
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          ...stoppedWorkload,
          image: stoppedWorkload.package,
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

    const { queryClient, router } = setupRouterWithPage('test-local-server')

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Server is not running')).toBeInTheDocument()
    })

    // The Apply button from CustomizeToolsTable should not be present
    expect(
      screen.queryByRole('button', { name: /Apply/i })
    ).not.toBeInTheDocument()
  })
})
