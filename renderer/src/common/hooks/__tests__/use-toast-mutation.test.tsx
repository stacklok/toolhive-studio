import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useToastMutation } from '../use-toast-mutation'

const mockToastPromise = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    promise: (...args: unknown[]) => mockToastPromise(...args),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useToastMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers toast.promise when successMsg is provided', async () => {
    const { result } = renderHook(
      () =>
        useToastMutation({
          mutationFn: async () => 'ok',
          successMsg: 'Done',
        }),
      { wrapper: createWrapper() }
    )

    await result.current.mutateAsync(undefined)

    expect(mockToastPromise).toHaveBeenCalledTimes(1)
    const [, config] = mockToastPromise.mock.calls[0]!
    expect(config.success).toBe('Done')
    expect(typeof config.error).toBe('function')
  })

  // Regression: see issue #2293 — when successMsg is null, the error toast was
  // never registered, silently swallowing failures for callers that navigate
  // away on success (e.g. signin) but still want user-visible error feedback.
  it('still shows the error toast when successMsg is null but errorMsg is set', async () => {
    const error = new Error('boom')
    const { result } = renderHook(
      () =>
        useToastMutation({
          mutationFn: async () => {
            throw error
          },
          successMsg: null,
          errorMsg: 'Sign in failed. Please try again.',
        }),
      { wrapper: createWrapper() }
    )

    await expect(result.current.mutateAsync(undefined)).rejects.toBe(error)

    expect(mockToastPromise).toHaveBeenCalledTimes(1)
    const [, config] = mockToastPromise.mock.calls[0]!
    expect(config.success).toBeUndefined()
    expect(config.error(error)).toBe('Sign in failed. Please try again.')
  })

  it('invokes errorMsg as a function with the rejected error', async () => {
    const error = Object.assign(new Error('boom'), { detail: 'nope' })
    const errorMsg = vi.fn((e: unknown) => `got: ${(e as Error).message}`)

    const { result } = renderHook(
      () =>
        useToastMutation({
          mutationFn: async () => {
            throw error
          },
          successMsg: null,
          errorMsg,
        }),
      { wrapper: createWrapper() }
    )

    await expect(result.current.mutateAsync(undefined)).rejects.toBe(error)

    const [, config] = mockToastPromise.mock.calls[0]!
    expect(config.error(error)).toBe('got: boom')
    expect(errorMsg).toHaveBeenCalledWith(error)
  })

  it('stays silent when both successMsg is null and errorMsg is not set', async () => {
    const { result } = renderHook(
      () =>
        useToastMutation({
          mutationFn: async () => {
            throw new Error('boom')
          },
          successMsg: null,
        }),
      { wrapper: createWrapper() }
    )

    await expect(result.current.mutateAsync(undefined)).rejects.toThrow('boom')

    expect(mockToastPromise).not.toHaveBeenCalled()
  })

  it('falls back to error.detail when no errorMsg is configured', async () => {
    const error = { detail: 'server says no' }
    const { result } = renderHook(
      () =>
        useToastMutation({
          mutationFn: async () => {
            throw error
          },
          successMsg: 'Done',
        }),
      { wrapper: createWrapper() }
    )

    await expect(result.current.mutateAsync(undefined)).rejects.toBe(error)

    const [, config] = mockToastPromise.mock.calls[0]!
    expect(config.error(error)).toBe('server says no')
  })

  it('passes through toastId when provided', async () => {
    const { result } = renderHook(
      () =>
        useToastMutation({
          mutationFn: async () => 'ok',
          successMsg: null,
          errorMsg: 'X',
          toastId: 'signin',
        }),
      { wrapper: createWrapper() }
    )

    await result.current.mutateAsync(undefined).catch(() => {})

    await waitFor(() => expect(mockToastPromise).toHaveBeenCalled())
    const [, config] = mockToastPromise.mock.calls[0]!
    expect(config.id).toBe('signin')
  })
})
