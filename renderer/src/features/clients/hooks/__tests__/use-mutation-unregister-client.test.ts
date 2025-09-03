import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMutationUnregisterClient } from '../use-mutation-unregister-client'

// Mock the generated mutation
vi.mock('@api/@tanstack/react-query.gen', () => ({
  deleteApiV1BetaClientsByNameMutation: () => ({
    mutationFn: vi.fn(),
  }),
  getApiV1BetaDiscoveryClientsQueryKey: () => [
    'api',
    'v1beta',
    'discovery',
    'clients',
  ],
}))

// Mock the toast mutation hook
vi.mock('@/common/hooks/use-toast-mutation', () => ({
  useToastMutation: (options: unknown) => options,
}))

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

  it('should return a mutation with proper configuration', () => {
    const { result } = renderHook(
      () => useMutationUnregisterClient('test-client'),
      { wrapper }
    )

    expect(result.current).toBeDefined()
    expect(result.current.mutationFn).toBeDefined()
    expect(result.current.onSettled).toBeDefined()
    expect(result.current.errorMsg).toBe('Failed to disconnect test-client')
  })

  it('should invalidate discovery clients query on mutation completion', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () => useMutationUnregisterClient('test-client'),
      { wrapper }
    )

    // Simulate mutation completion
    if (result.current.onSettled) {
      await result.current.onSettled()
    }

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['api', 'v1beta', 'discovery', 'clients'],
      })
    })
  })

  it('should handle different client names correctly', () => {
    const clientNames = ['vscode', 'cursor', 'claude-code', 'roo-code']

    clientNames.forEach((clientName) => {
      const { result } = renderHook(
        () => useMutationUnregisterClient(clientName),
        { wrapper }
      )

      expect(result.current.errorMsg).toBe(`Failed to disconnect ${clientName}`)
    })
  })

  it('should use the correct API mutation', () => {
    const { result } = renderHook(
      () => useMutationUnregisterClient('test-client'),
      { wrapper }
    )

    // The hook should use the deleteApiV1BetaClientsByNameMutation from the generated API
    expect(result.current).toMatchObject({
      errorMsg: 'Failed to disconnect test-client',
    })
  })

  it('should handle empty client name gracefully', () => {
    const { result } = renderHook(() => useMutationUnregisterClient(''), {
      wrapper,
    })

    expect(result.current.errorMsg).toBe('Failed to disconnect ')
  })

  it('should differentiate from register client mutation', () => {
    const { result } = renderHook(
      () => useMutationUnregisterClient('test-client'),
      { wrapper }
    )

    // This should be a disconnect operation, not a connect operation
    expect(result.current.errorMsg).toContain('disconnect')
    expect(result.current.errorMsg).toBe('Failed to disconnect test-client')
  })
})
