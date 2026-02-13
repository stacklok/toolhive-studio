import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useAutoResumePolling } from '../use-auto-resume-polling'
import * as polling from '../../lib/polling'
import type { CoreWorkload } from '@common/api/generated/types.gen'

describe('useAutoResumePolling', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: 0, staleTime: 0, retry: false },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })

  function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  function makeWorkload(
    name: string,
    status: CoreWorkload['status']
  ): CoreWorkload {
    return { name, status } as CoreWorkload
  }

  it('starts polling for a server with "starting" status', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerStatus')
      .mockResolvedValue(true)

    const workloads = [makeWorkload('my-server', 'starting')]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    await waitFor(() => {
      expect(pollSpy).toHaveBeenCalledWith(expect.any(Function), 'running')
    })
  })

  it('starts polling for a server with "stopping" status', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerStatus')
      .mockResolvedValue(true)

    const workloads = [makeWorkload('my-server', 'stopping')]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    await waitFor(() => {
      expect(pollSpy).toHaveBeenCalledWith(expect.any(Function), 'stopped')
    })
  })

  it('starts polling for a server with "restarting" status', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerStatus')
      .mockResolvedValue(true)

    const workloads = [
      makeWorkload('my-server', 'restarting' as CoreWorkload['status']),
    ]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    await waitFor(() => {
      expect(pollSpy).toHaveBeenCalledWith(expect.any(Function), 'running')
    })
  })

  it('does NOT start polling for servers in stable states', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerStatus')
      .mockResolvedValue(true)

    const workloads = [
      makeWorkload('running-server', 'running'),
      makeWorkload('stopped-server', 'stopped'),
    ]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    // Give the effect time to run
    await new Promise((r) => setTimeout(r, 50))

    expect(pollSpy).not.toHaveBeenCalled()
  })

  it('does not start a second poll if one is already in-flight for the same server', async () => {
    // Create a poll that never resolves so it stays in-flight
    let resolveFirstPoll!: (value: boolean) => void
    const pollSpy = vi.spyOn(polling, 'pollServerStatus').mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveFirstPoll = resolve
        })
    )

    const workloads = [makeWorkload('my-server', 'starting')]

    // First render kicks off polling
    const { rerender } = renderHook(
      ({ w }) => useAutoResumePolling(w, 'default'),
      { wrapper, initialProps: { w: workloads } }
    )

    await waitFor(() => {
      expect(pollSpy).toHaveBeenCalledTimes(1)
    })

    // Re-render with the same transitioning workload
    rerender({ w: [...workloads] })

    // Give the effect time to run again
    await new Promise((r) => setTimeout(r, 50))

    // Should still only have been called once — deduplication via query cache
    expect(pollSpy).toHaveBeenCalledTimes(1)

    // Clean up the hanging promise
    resolveFirstPoll(true)
  })

  it('invalidates workloads query after successful polling', async () => {
    vi.spyOn(polling, 'pollServerStatus').mockResolvedValue(true)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const workloads = [makeWorkload('my-server', 'starting')]

    renderHook(() => useAutoResumePolling(workloads, 'my-group'), { wrapper })

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining([
            expect.objectContaining({
              query: { all: true, group: 'my-group' },
            }),
          ]),
        })
      )
    })
  })

  it('does NOT invalidate workloads query when polling fails', async () => {
    vi.spyOn(polling, 'pollServerStatus').mockResolvedValue(false)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const workloads = [makeWorkload('my-server', 'starting')]

    renderHook(() => useAutoResumePolling(workloads, 'my-group'), { wrapper })

    // Give the effect + promise chain time to complete
    await new Promise((r) => setTimeout(r, 100))

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('handles multiple transitioning servers independently', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerStatus')
      .mockResolvedValue(true)

    const workloads = [
      makeWorkload('server-a', 'starting'),
      makeWorkload('server-b', 'stopping'),
    ]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    await waitFor(() => {
      expect(pollSpy).toHaveBeenCalledTimes(2)
    })

    // One for 'running', one for 'stopped'
    const targetStatuses = pollSpy.mock.calls.map((call) => call[1])
    expect(targetStatuses).toContain('running')
    expect(targetStatuses).toContain('stopped')
  })
})
