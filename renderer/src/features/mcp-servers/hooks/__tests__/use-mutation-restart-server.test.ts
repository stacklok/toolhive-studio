import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useMutationRestartServerAtStartup,
  useMutationRestartServer,
} from '../use-mutation-restart-server'
import type { CoreWorkload } from '@api/types.gen'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'
import { toast } from 'sonner'

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

// Factory functions for test data
const createWorkload = (
  name: string,
  status: string = 'running'
): CoreWorkload => ({ name, status })

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
    const { Wrapper } = createQueryClientWrapper()

    const shutdownServers = [
      createWorkload('postgres-db', 'stopped'),
      createWorkload('github', 'stopped'),
    ]
    vi.mocked(
      window.electronAPI.shutdownStore.getLastShutdownServers
    ).mockResolvedValue(shutdownServers)

    // Use MSW to simulate servers becoming 'running' after restart for polling
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), ({ params }) => {
        const { name } = params
        if (name === 'postgres-db' || name === 'github') {
          return HttpResponse.json(createWorkload(name as string, 'running'))
        }
        // Fall back to default behavior for other servers
        return HttpResponse.json({ error: 'Server not found' }, { status: 404 })
      })
    )

    const { result } = renderHook(() => useMutationRestartServerAtStartup(), {
      wrapper: Wrapper,
    })

    // Note: useToastMutation doesn't return the promise, so we can't await it
    result.current.mutateAsync({ body: { names: ['postgres-db', 'github'] } })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(
      window.electronAPI.shutdownStore.getLastShutdownServers
    ).toHaveBeenCalled()
    expect(
      window.electronAPI.shutdownStore.clearShutdownHistory
    ).toHaveBeenCalled()
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

    // Execute mutation with non-existent server name (will return 404 from MSW handler)
    result.current.mutateAsync({ body: { names: ['non-existent-server'] } })

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

    // Execute mutation with non-existent server (will return 404 from MSW handler)
    result.current.mutateAsync({ path: { name: serverName } })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
