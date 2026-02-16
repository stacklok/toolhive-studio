import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, act } from '@testing-library/react'
import { useAutoResumePolling } from '../use-auto-resume-polling'
import * as polling from '../../lib/polling'
import type { CoreWorkload } from '@common/api/generated/types.gen'

/** Flush React effects and pending promise chains */
const flushAsync = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })

describe('useAutoResumePolling', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.useFakeTimers()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: 0, staleTime: 0, retry: false },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
    vi.useRealTimers()
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
      .spyOn(polling, 'pollServerUntilStable')
      .mockResolvedValue(true)

    const workloads = [makeWorkload('my-server', 'starting')]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    await flushAsync()

    expect(pollSpy).toHaveBeenCalledWith(expect.any(Function))
  })

  it('starts polling for a server with "stopping" status', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerUntilStable')
      .mockResolvedValue(true)

    const workloads = [makeWorkload('my-server', 'stopping')]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    await flushAsync()

    expect(pollSpy).toHaveBeenCalledWith(expect.any(Function))
  })

  it('starts polling for a server with "restarting" status', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerUntilStable')
      .mockResolvedValue(true)

    const workloads = [
      makeWorkload('my-server', 'restarting' as CoreWorkload['status']),
    ]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    await flushAsync()

    expect(pollSpy).toHaveBeenCalledWith(expect.any(Function))
  })

  it('uses pollServerDelete for servers with "removing" status', async () => {
    const stableSpy = vi
      .spyOn(polling, 'pollServerUntilStable')
      .mockResolvedValue(true)
    const deleteSpy = vi
      .spyOn(polling, 'pollServerDelete')
      .mockResolvedValue(true)

    const workloads = [
      makeWorkload('my-server', 'removing' as CoreWorkload['status']),
    ]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    await flushAsync()

    expect(deleteSpy).toHaveBeenCalledWith(expect.any(Function))
    expect(stableSpy).not.toHaveBeenCalled()
  })

  it('does NOT start polling for servers in stable states', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerUntilStable')
      .mockResolvedValue(true)

    const workloads = [
      makeWorkload('running-server', 'running'),
      makeWorkload('stopped-server', 'stopped'),
    ]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    await flushAsync()

    expect(pollSpy).not.toHaveBeenCalled()
  })

  it('does not start a second poll if one is already in-flight for the same server', async () => {
    // Create a poll that never resolves so it stays in-flight
    let resolveFirstPoll!: (value: boolean) => void
    const pollSpy = vi
      .spyOn(polling, 'pollServerUntilStable')
      .mockImplementation(
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

    await flushAsync()
    expect(pollSpy).toHaveBeenCalledTimes(1)

    // Re-render with the same transitioning workload
    rerender({ w: [...workloads] })

    await flushAsync()

    // Should still only have been called once — deduplication via ref + query cache
    expect(pollSpy).toHaveBeenCalledTimes(1)

    // Clean up the hanging promise
    resolveFirstPoll(true)
  })

  it('does not re-trigger polling after it completes even if workloads still show transition status', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerUntilStable')
      .mockResolvedValue(true)

    const workloads = [makeWorkload('my-server', 'starting')]

    const { rerender } = renderHook(
      ({ w }) => useAutoResumePolling(w, 'default'),
      { wrapper, initialProps: { w: workloads } }
    )

    // Wait for first poll to complete
    await flushAsync()
    expect(pollSpy).toHaveBeenCalledTimes(1)

    // Simulate re-render with stale data still showing transition status
    rerender({ w: [makeWorkload('my-server', 'starting')] })
    await flushAsync()

    // Should NOT have started a second poll — ref tracks initiated polls
    expect(pollSpy).toHaveBeenCalledTimes(1)
  })

  it('re-enables polling after server reaches stable state and transitions again', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerUntilStable')
      .mockResolvedValue(true)

    const { rerender } = renderHook(
      ({ w }) => useAutoResumePolling(w, 'default'),
      {
        wrapper,
        initialProps: { w: [makeWorkload('my-server', 'starting')] },
      }
    )

    // First poll
    await flushAsync()
    expect(pollSpy).toHaveBeenCalledTimes(1)

    // Server reaches stable state — clears the ref
    rerender({ w: [makeWorkload('my-server', 'running')] })
    await flushAsync()

    // Server transitions again (e.g. stopped via CLI)
    rerender({ w: [makeWorkload('my-server', 'stopping')] })
    await flushAsync()

    expect(pollSpy).toHaveBeenCalledTimes(2)
  })

  it('invalidates workloads query after successful polling', async () => {
    vi.spyOn(polling, 'pollServerUntilStable').mockResolvedValue(true)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const workloads = [makeWorkload('my-server', 'starting')]

    renderHook(() => useAutoResumePolling(workloads, 'my-group'), { wrapper })

    await flushAsync()

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

  it('does NOT invalidate workloads query when polling times out', async () => {
    vi.spyOn(polling, 'pollServerUntilStable').mockResolvedValue(false)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const workloads = [makeWorkload('my-server', 'starting')]

    renderHook(() => useAutoResumePolling(workloads, 'my-group'), { wrapper })

    await flushAsync()

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('clears initiated ref on polling rejection so next render can retry', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerUntilStable')
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(true)

    const workloads = [makeWorkload('my-server', 'starting')]

    const { rerender } = renderHook(
      ({ w }) => useAutoResumePolling(w, 'default'),
      { wrapper, initialProps: { w: workloads } }
    )

    // Wait for the first poll to fail and .catch to clear the ref
    await flushAsync()
    expect(pollSpy).toHaveBeenCalledTimes(1)

    // Re-render with the same transition status — should retry now
    rerender({ w: [makeWorkload('my-server', 'starting')] })
    await flushAsync()

    expect(pollSpy).toHaveBeenCalledTimes(2)
  })

  it('clears initiated ref on polling timeout (success: false) so next render can retry', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerUntilStable')
      .mockResolvedValueOnce(false) // timeout — max attempts reached
      .mockResolvedValueOnce(true)

    const workloads = [makeWorkload('my-server', 'starting')]

    const { rerender } = renderHook(
      ({ w }) => useAutoResumePolling(w, 'default'),
      { wrapper, initialProps: { w: workloads } }
    )

    // Wait for the first poll to resolve with false (timeout)
    await flushAsync()
    expect(pollSpy).toHaveBeenCalledTimes(1)

    // Re-render with the same transition status — should retry
    rerender({ w: [makeWorkload('my-server', 'starting')] })
    await flushAsync()

    expect(pollSpy).toHaveBeenCalledTimes(2)
  })

  it('handles multiple transitioning servers independently', async () => {
    const pollSpy = vi
      .spyOn(polling, 'pollServerUntilStable')
      .mockResolvedValue(true)

    const workloads = [
      makeWorkload('server-a', 'starting'),
      makeWorkload('server-b', 'stopping'),
    ]

    renderHook(() => useAutoResumePolling(workloads, 'default'), { wrapper })

    await flushAsync()

    expect(pollSpy).toHaveBeenCalledTimes(2)
  })
})
