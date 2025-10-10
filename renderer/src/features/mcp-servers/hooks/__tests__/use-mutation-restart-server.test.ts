import { renderHook, waitFor, act } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useMutationRestartServerAtStartup,
  useMutationRestartServer,
} from '../use-mutation-restart-server'
import type { V1WorkloadListResponse } from '@api/types.gen'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { toast } from 'sonner'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { getApiV1BetaWorkloadsQueryKey } from '@api/@tanstack/react-query.gen'

vi.mock('sonner', () => ({
  toast: {
    dismiss: vi.fn(),
    promise: vi.fn((promise) => promise.catch(() => {})),
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}))

// Mock electron API
const mockOnServerShutdown = vi.fn()
Object.defineProperty(window, 'electronAPI', {
  value: {
    shutdownStore: {
      getLastShutdownServers: vi.fn(),
      clearShutdownHistory: vi.fn(),
    },
    onServerShutdown: mockOnServerShutdown,
  },
  writable: true,
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

beforeEach(() => {
  vi.clearAllMocks()
  mockOnServerShutdown.mockClear()
  window.electronAPI.shutdownStore.getLastShutdownServers = vi
    .fn()
    .mockResolvedValue([])
  window.electronAPI.shutdownStore.clearShutdownHistory = vi
    .fn()
    .mockResolvedValue(undefined)
})

describe('useMutationRestartServerAtStartup', () => {
  it('successfully restarts servers from shutdown list', async () => {
    const { Wrapper, queryClient } = createQueryClientWrapper()

    // Use MSW to simulate servers becoming 'running' after restart for polling
    server.use(
      http.get(
        mswEndpoint('/api/v1beta/workloads/:name/status'),
        ({ params }) => {
          const { name } = params
          if (name === 'postgres-db' || name === 'github') {
            return HttpResponse.json({
              status: 'running',
            })
          }
          // Fall back to default behavior for other servers
          return HttpResponse.json({
            status: 'stopped',
          })
        }
      )
    )

    const { result } = renderHook(() => useMutationRestartServerAtStartup(), {
      wrapper: Wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync({
        body: { names: ['postgres-db', 'github'] },
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // After successful restart, shutdown history should be cleared
    expect(
      window.electronAPI.shutdownStore.clearShutdownHistory
    ).toHaveBeenCalled()

    await waitFor(() => {
      expect(queryClient.isMutating()).toBe(0)
      expect(queryClient.isFetching()).toBe(0)
    })
  })

  it('handles empty server list', async () => {
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationRestartServerAtStartup(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({ body: { names: [] } })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(
      window.electronAPI.shutdownStore.getLastShutdownServers
    ).not.toHaveBeenCalled()
  })

  it('handles API error gracefully', async () => {
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationRestartServerAtStartup(), {
      wrapper: Wrapper,
    })

    // Force API error for non-existent server by overriding the endpoint
    server.use(
      http.post(
        mswEndpoint('/api/v1beta/workloads/restart'),
        async ({ request }) => {
          const { names } = (await request.json()) as { names: string[] }
          if (names.includes('non-existent-server')) {
            return HttpResponse.json(
              { error: 'Server not found' },
              { status: 404 }
            )
          }
          return new HttpResponse(null, { status: 202 })
        }
      )
    )

    // Execute mutation with non-existent server name (overridden MSW handler returns 404)
    result.current
      .mutateAsync({ body: { names: ['non-existent-server'] } })
      .catch(() => {
        // Expected error, ignore
      })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('dismisses toast on server shutdown', async () => {
    const { Wrapper } = createQueryClientWrapper()

    renderHook(() => useMutationRestartServerAtStartup(), {
      wrapper: Wrapper,
    })

    expect(mockOnServerShutdown).toHaveBeenCalledTimes(1)
    const shutdownCallback = mockOnServerShutdown.mock.calls[0]?.[0]
    expect(shutdownCallback).toBeDefined()

    shutdownCallback?.()

    expect(vi.mocked(toast.dismiss)).toHaveBeenCalledWith(
      'restart-servers-startup'
    )
  })
})

describe('useMutationRestartServer', () => {
  it('successfully restarts a single server', async () => {
    const { Wrapper } = createQueryClientWrapper()
    const serverName = 'vscode-server'

    const { result } = renderHook(
      () => useMutationRestartServer({ name: serverName }),
      { wrapper: Wrapper }
    )

    result.current.mutateAsync({ path: { name: serverName } })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('handles API error for single server restart', async () => {
    const { Wrapper } = createQueryClientWrapper()
    const serverName = 'non-existent-server'

    const { result } = renderHook(
      () => useMutationRestartServer({ name: serverName }),
      { wrapper: Wrapper }
    )

    result.current.mutateAsync({ path: { name: serverName } }).catch(() => {
      // Expected error, ignore
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('should update the correct group cache when restarting a server from non-default group', async () => {
    const { Wrapper, queryClient } = createQueryClientWrapper()
    const serverName = 'postgres-db'
    const groupName = 'engineering'

    // Pre-populate the engineering group's cache with a stopped server
    const engineeringQueryKey = getApiV1BetaWorkloadsQueryKey({
      query: { all: true, group: groupName },
    })

    queryClient.setQueryData(engineeringQueryKey, {
      workloads: [{ name: serverName, status: 'stopped', group: groupName }],
    } as V1WorkloadListResponse)

    const { result } = renderHook(
      () => useMutationRestartServer({ name: serverName }),
      { wrapper: Wrapper }
    )

    // Trigger the mutation (don't await to check optimistic update)
    act(() => {
      result.current.mutateAsync({ path: { name: serverName } }).catch(() => {
        // Ignore errors for this test
      })
    })

    // Check that the engineering group's cache was updated optimistically
    await waitFor(() => {
      const engineeringData = queryClient.getQueryData(engineeringQueryKey) as
        | V1WorkloadListResponse
        | undefined
      const server = engineeringData?.workloads?.find(
        (w) => w.name === serverName
      )

      // This should pass once the bug is fixed
      expect(server?.status).toBe('running')
    })
  })
})
