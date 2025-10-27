import { renderHook } from '@testing-library/react'
import { expect, it, vi, beforeEach, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useOptimizedWorkloads } from '../use-optimized-workloads'
import { server } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import log from 'electron-log/renderer'
import { META_MCP_SERVER_NAME } from '@/common/lib/constants'

vi.mock('electron-log/renderer', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

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

describe('useOptimizedWorkloads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully fetches and filters workloads by group name and running status', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () =>
        HttpResponse.json({
          workloads: [
            {
              name: 'workload-1',
              group: 'test-group',
              status: 'running',
              image: 'test-image:latest',
            },
            {
              name: 'workload-2',
              group: 'test-group',
              status: 'running',
              image: 'test-image:latest',
            },
            {
              name: 'workload-3',
              group: 'other-group',
              status: 'running',
              image: 'test-image:latest',
            },
            {
              name: 'workload-4',
              group: 'test-group',
              status: 'stopped',
              image: 'test-image:latest',
            },
          ],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { result } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const workloadNames = await result.current.getOptimizedWorkloads({
      groupName: 'test-group',
      serverName: META_MCP_SERVER_NAME,
    })

    expect(workloadNames).toEqual(['workload-1', 'workload-2'])
    expect(workloadNames).not.toContain('workload-3') // wrong group
    expect(workloadNames).not.toContain('workload-4') // not running
  })

  it('returns empty array when no workloads match the group name', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () =>
        HttpResponse.json({
          workloads: [
            {
              name: 'workload-1',
              group: 'other-group',
              status: 'running',
              image: 'test-image:latest',
            },
            {
              name: 'workload-2',
              group: 'different-group',
              status: 'running',
              image: 'test-image:latest',
            },
          ],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { result } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const workloadNames = await result.current.getOptimizedWorkloads({
      groupName: 'test-group',
      serverName: META_MCP_SERVER_NAME,
    })

    expect(workloadNames).toEqual([])
  })

  it('filters out non-running workloads even if they match the group', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () =>
        HttpResponse.json({
          workloads: [
            {
              name: 'running-workload',
              group: 'test-group',
              status: 'running',
              image: 'test-image:latest',
            },
            {
              name: 'stopped-workload',
              group: 'test-group',
              status: 'stopped',
              image: 'test-image:latest',
            },
            {
              name: 'pending-workload',
              group: 'test-group',
              status: 'pending',
              image: 'test-image:latest',
            },
            {
              name: 'failed-workload',
              group: 'test-group',
              status: 'failed',
              image: 'test-image:latest',
            },
          ],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { result } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const workloadNames = await result.current.getOptimizedWorkloads({
      groupName: 'test-group',
      serverName: META_MCP_SERVER_NAME,
    })

    expect(workloadNames).toEqual(['running-workload'])
    expect(workloadNames.length).toBe(1)
  })

  it('handles API errors and returns empty array', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { result } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const workloadNames = await result.current.getOptimizedWorkloads({
      groupName: 'test-group',
      serverName: META_MCP_SERVER_NAME,
    })

    expect(workloadNames).toEqual([])
    expect(log.error).toHaveBeenCalledWith(
      'Failed to get optimized workloads',
      expect.anything()
    )
  })

  it('handles network errors and returns empty array', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () => HttpResponse.error())
    )

    const { Wrapper } = createQueryClientWrapper()
    const { result } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const workloadNames = await result.current.getOptimizedWorkloads({
      groupName: 'test-group',
      serverName: META_MCP_SERVER_NAME,
    })

    expect(workloadNames).toEqual([])
    expect(log.error).toHaveBeenCalledWith(
      'Failed to get optimized workloads',
      expect.objectContaining({
        message: expect.stringContaining('Failed to fetch'),
      })
    )
  })

  it('returns empty array when workloads array is undefined or null', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () =>
        HttpResponse.json({
          workloads: null,
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { result } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const workloadNames = await result.current.getOptimizedWorkloads({
      groupName: 'test-group',
      serverName: META_MCP_SERVER_NAME,
    })

    expect(workloadNames).toEqual([])
  })

  it('returns empty array when no workloads exist', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () =>
        HttpResponse.json({
          workloads: [],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { result } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const workloadNames = await result.current.getOptimizedWorkloads({
      groupName: 'test-group',
      serverName: META_MCP_SERVER_NAME,
    })

    expect(workloadNames).toEqual([])
  })

  it('handles multiple calls with different group names correctly', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () =>
        HttpResponse.json({
          workloads: [
            {
              name: 'group-a-workload-1',
              group: 'group-a',
              status: 'running',
              image: 'test-image:latest',
            },
            {
              name: 'group-a-workload-2',
              group: 'group-a',
              status: 'running',
              image: 'test-image:latest',
            },
            {
              name: 'group-b-workload-1',
              group: 'group-b',
              status: 'running',
              image: 'test-image:latest',
            },
          ],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { result } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const groupAWorkloads = await result.current.getOptimizedWorkloads({
      groupName: 'group-a',
      serverName: META_MCP_SERVER_NAME,
    })
    const groupBWorkloads = await result.current.getOptimizedWorkloads({
      groupName: 'group-b',
      serverName: META_MCP_SERVER_NAME,
    })

    expect(groupAWorkloads).toEqual([
      'group-a-workload-1',
      'group-a-workload-2',
    ])
    expect(groupBWorkloads).toEqual(['group-b-workload-1'])
  })

  it('returns empty array when serverName is not META_MCP_SERVER_NAME', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () =>
        HttpResponse.json({
          workloads: [
            {
              name: 'workload-1',
              group: 'test-group',
              status: 'running',
              image: 'test-image:latest',
            },
          ],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { result } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const workloadNames = await result.current.getOptimizedWorkloads({
      groupName: 'test-group',
      serverName: 'some-other-server',
    })

    expect(workloadNames).toEqual([])
  })

  it('returns empty array when serverName is undefined', async () => {
    server.use(
      http.get(mswEndpoint('/api/v1beta/workloads'), () =>
        HttpResponse.json({
          workloads: [
            {
              name: 'workload-1',
              group: 'test-group',
              status: 'running',
              image: 'test-image:latest',
            },
          ],
        })
      )
    )

    const { Wrapper } = createQueryClientWrapper()
    const { result } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const workloadNames = await result.current.getOptimizedWorkloads({
      groupName: 'test-group',
    })

    expect(workloadNames).toEqual([])
  })

  it('memoizes the getOptimizedWorkloads function', async () => {
    const { Wrapper } = createQueryClientWrapper()
    const { result, rerender } = renderHook(() => useOptimizedWorkloads(), {
      wrapper: Wrapper,
    })

    const firstFunction = result.current.getOptimizedWorkloads

    rerender()

    const secondFunction = result.current.getOptimizedWorkloads

    expect(firstFunction).toBe(secondFunction)
  })
})
