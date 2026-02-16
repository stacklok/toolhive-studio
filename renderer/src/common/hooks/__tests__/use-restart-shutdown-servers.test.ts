import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { recordRequests } from '@/common/mocks/node'
import { toast } from 'sonner'
import { mockedPostApiV1BetaWorkloadsRestart } from '@/common/mocks/fixtures/workloads_restart/post'
import { mockedGetApiV1BetaWorkloadsByNameStatus } from '@/common/mocks/fixtures/workloads_name_status/get'
import {
  getApiV1BetaWorkloadsQueryKey,
  getApiV1BetaWorkloadsOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import type { V1WorkloadListResponse } from '@common/api/generated/types.gen'
import { mockedGetApiV1BetaWorkloads } from '@/common/mocks/fixtures/workloads/get'
import { useRestartShutdownServers } from '../use-restart-shutdown-servers'

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

describe('useRestartShutdownServers', () => {
  it('restarts servers that still exist from the shutdown list', async () => {
    const rec = recordRequests()
    const { Wrapper, queryClient } = createQueryClientWrapper()

    mockGetLastShutdownServers.mockResolvedValue([
      { name: 'postgres-db', status: 'running', group: 'default' },
      { name: 'github', status: 'running', group: 'research' },
    ])

    mockedGetApiV1BetaWorkloadsByNameStatus.override((_data, info) => {
      const name = info.params.name
      if (name === 'postgres-db' || name === 'github') {
        return { status: 'running' }
      }
      return { status: 'stopped' }
    })

    renderHook(() => useRestartShutdownServers(), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      const restartCall = rec.recordedRequests.find(
        (r) =>
          r.method === 'POST' && r.pathname === '/api/v1beta/workloads/restart'
      )
      expect(restartCall?.payload).toEqual({
        names: ['postgres-db', 'github'],
      })
    })

    await waitFor(() => {
      expect(mockClearShutdownHistory).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(queryClient.isMutating()).toBe(0)
      expect(queryClient.isFetching()).toBe(0)
    })
  })

  it('skips servers deleted via CLI and only restarts existing ones', async () => {
    const rec = recordRequests()
    const { Wrapper, queryClient } = createQueryClientWrapper()

    // Shutdown store has both an existing and a deleted server
    mockGetLastShutdownServers.mockResolvedValue([
      { name: 'postgres-db', status: 'running', group: 'default' },
      { name: 'deleted-server', status: 'running', group: 'default' },
    ])

    // API only returns the existing server (deleted one was removed via CLI)
    mockedGetApiV1BetaWorkloads.override(() => ({
      workloads: [{ name: 'postgres-db', status: 'stopped', group: 'default' }],
    }))

    mockedGetApiV1BetaWorkloadsByNameStatus.override((_data, info) => {
      if (info.params.name === 'postgres-db') {
        return { status: 'running' }
      }
      return { status: 'stopped' }
    })

    renderHook(() => useRestartShutdownServers(), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      const restartCall = rec.recordedRequests.find(
        (r) =>
          r.method === 'POST' && r.pathname === '/api/v1beta/workloads/restart'
      )
      // Only the existing server should be restarted
      expect(restartCall?.payload).toEqual({ names: ['postgres-db'] })
    })

    await waitFor(() => {
      expect(queryClient.isMutating()).toBe(0)
      expect(queryClient.isFetching()).toBe(0)
    })

    // Verify the cache does not contain the deleted server
    const queryKey = getApiV1BetaWorkloadsQueryKey({
      query: { all: true, group: 'default' },
    })
    await queryClient.fetchQuery({
      ...getApiV1BetaWorkloadsOptions({
        query: { all: true, group: 'default' },
      }),
    })
    const cachedData =
      queryClient.getQueryData<V1WorkloadListResponse>(queryKey)
    const cachedNames = cachedData?.workloads?.map((w) => w.name) ?? []
    expect(cachedNames).toContain('postgres-db')
    expect(cachedNames).not.toContain('deleted-server')
  })

  it('clears shutdown history when all servers were deleted', async () => {
    const { Wrapper } = createQueryClientWrapper()

    mockGetLastShutdownServers.mockResolvedValue([
      { name: 'deleted-server', status: 'running', group: 'default' },
    ])

    // API returns no workloads (server was removed via CLI)
    mockedGetApiV1BetaWorkloads.override(() => ({
      workloads: [],
    }))

    renderHook(() => useRestartShutdownServers(), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(mockClearShutdownHistory).toHaveBeenCalled()
    })
  })

  it('does nothing when shutdown list is empty', async () => {
    const rec = recordRequests()
    const { Wrapper } = createQueryClientWrapper()

    mockGetLastShutdownServers.mockResolvedValue([])

    renderHook(() => useRestartShutdownServers(), {
      wrapper: Wrapper,
    })

    // Give it a tick to process
    await waitFor(() => {
      expect(mockGetLastShutdownServers).toHaveBeenCalled()
    })

    const restartCall = rec.recordedRequests.find(
      (r) =>
        r.method === 'POST' && r.pathname === '/api/v1beta/workloads/restart'
    )
    expect(restartCall).toBeUndefined()
  })

  it('dismisses toast on server shutdown', async () => {
    const { Wrapper } = createQueryClientWrapper()

    renderHook(() => useRestartShutdownServers(), {
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

  it('handles API error gracefully', async () => {
    const { Wrapper } = createQueryClientWrapper()

    mockGetLastShutdownServers.mockResolvedValue([
      { name: 'some-server', status: 'running', group: 'default' },
    ])

    mockedGetApiV1BetaWorkloads.override(() => ({
      workloads: [{ name: 'some-server', status: 'stopped', group: 'default' }],
    }))

    mockedPostApiV1BetaWorkloadsRestart.activateScenario('not-found')

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() => useRestartShutdownServers(), {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error during shutdown server restart:',
        expect.anything()
      )
    })

    consoleSpy.mockRestore()
  })
})
