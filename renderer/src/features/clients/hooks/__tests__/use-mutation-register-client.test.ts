import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMutationRegisterClient } from '../use-mutation-register-client'

describe('useMutationRegisterClient', () => {
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

  it('should register a client with a mandatory group and invalidate discovery clients query', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () => useMutationRegisterClient({ name: 'test-client', group: 'research-team' }),
      { wrapper }
    )

    // Execute the mutation with the correct request body format including mandatory group
    await result.current.mutateAsync({ 
      body: { 
        name: 'test-client',
        groups: ['research-team'] // Mandatory group parameter
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

  it('should fail when trying to register a client without a group', async () => {
    const { result } = renderHook(
      () => useMutationRegisterClient({ name: 'test-client', group: 'research-team' }),
      { wrapper }
    )

    // This should fail because group is required
    await expect(
      result.current.mutateAsync({ 
        body: { 
          name: 'test-client'
          // Missing groups parameter
        } 
      })
    ).rejects.toThrow()
  })
})
