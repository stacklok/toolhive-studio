import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMutationUnregisterClient } from '../use-mutation-unregister-client'

describe('useMutationUnregisterClient', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  it('should unregister a client and invalidate discovery clients query', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () => useMutationUnregisterClient({ name: 'test-client', group: 'research-team' }),
      { wrapper }
    )

    // Execute the mutation with the correct request format
    await result.current.mutateAsync({ 
      path: { 
        name: 'test-client'
      } 
    })

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: [
          {
            _id: 'getApiV1BetaDiscoveryClients',
            baseUrl: 'https://foo.bar.com',
          },
        ],
      })
    })
  })
})
