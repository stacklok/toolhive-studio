import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useMutationRestartServer } from '../use-mutation-restart-server'
import { recordRequests } from '@/common/mocks/node'
import { mockedPostApiV1BetaWorkloadsByNameRestart } from '@/common/mocks/fixtures/workloads_name_restart/post'

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
