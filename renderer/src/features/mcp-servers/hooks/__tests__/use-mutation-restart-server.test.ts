import { renderHook, waitFor, act } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useMutationRestartServerAtStartup,
  useMutationRestartServer,
} from '../use-mutation-restart-server'
import { recordRequests } from '@/common/mocks/node'
import { toast } from 'sonner'
import { mockedPostApiV1BetaWorkloadsRestart } from '@/common/mocks/fixtures/workloads_restart/post'
import { mockedPostApiV1BetaWorkloadsByNameRestart } from '@/common/mocks/fixtures/workloads_name_restart/post'
import { mockedGetApiV1BetaWorkloadsByNameStatus } from '@/common/mocks/fixtures/workloads_name_status/get'

const mockOnServerShutdown = vi.fn()
const mockGetLastShutdownServers = vi.fn()
const mockClearShutdownHistory = vi.fn()

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

  window.electronAPI.shutdownStore = {
    getLastShutdownServers: mockGetLastShutdownServers,
    clearShutdownHistory: mockClearShutdownHistory,
  } as typeof window.electronAPI.shutdownStore
  window.electronAPI.onServerShutdown = mockOnServerShutdown

  mockOnServerShutdown.mockClear()
  mockGetLastShutdownServers.mockResolvedValue([])
  mockClearShutdownHistory.mockResolvedValue(undefined)
})

describe('useMutationRestartServerAtStartup', () => {
  it('successfully restarts servers from shutdown list', async () => {
    const rec = recordRequests()
    const { Wrapper, queryClient } = createQueryClientWrapper()

    mockedGetApiV1BetaWorkloadsByNameStatus.override((_data, info) => {
      const name = info.params.name
      if (name === 'postgres-db' || name === 'github') {
        return {
          status: 'running',
        }
      }
      return {
        status: 'stopped',
      }
    })

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

    const restartCall = rec.recordedRequests.find(
      (r) =>
        r.method === 'POST' && r.pathname === '/api/v1beta/workloads/restart'
    )
    expect(restartCall?.payload).toEqual({ names: ['postgres-db', 'github'] })

    expect(mockClearShutdownHistory).toHaveBeenCalled()

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

    expect(mockGetLastShutdownServers).not.toHaveBeenCalled()
  })

  it('handles API error gracefully', async () => {
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationRestartServerAtStartup(), {
      wrapper: Wrapper,
    })

    mockedPostApiV1BetaWorkloadsRestart.activateScenario('not-found')

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
    const rec = recordRequests()
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

    const restartCall = rec.recordedRequests.find(
      (r) =>
        r.method === 'POST' &&
        r.pathname === `/api/v1beta/workloads/${serverName}/restart`
    )
    expect(restartCall).toBeDefined()
  })

  it('handles API error for single server restart', async () => {
    const { Wrapper } = createQueryClientWrapper()
    const serverName = 'non-existent-server'

    mockedPostApiV1BetaWorkloadsByNameRestart.activateScenario('not-found')

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
})
