import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi, describe, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { toast } from 'sonner'
import { useMutationDeleteBuild } from '../use-mutation-delete-build'
import { recordRequests } from '@/common/mocks/node'
import { mockedDeleteApiV1BetaSkillsBuildsByTag } from '@/common/mocks/fixtures/skills_builds_tag/delete'
import { trackEvent } from '@/common/lib/analytics'

vi.mock('@/common/lib/analytics', () => ({
  trackEvent: vi.fn(),
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

describe('useMutationDeleteBuild', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear()
  })

  it('sends DELETE to /api/v1beta/skills/builds/{tag} with correct path param', async () => {
    const rec = recordRequests()
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationDeleteBuild(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({
      path: { tag: 'localhost/my-skill:v1.0.0' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const deleteCall = rec.recordedRequests.find(
      (r) =>
        r.method === 'DELETE' &&
        r.pathname.includes('/api/v1beta/skills/builds/')
    )
    expect(deleteCall).toBeDefined()
  })

  it('shows success toast with tag on success', async () => {
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationDeleteBuild(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({ path: { tag: 'localhost/my-skill:v1.0.0' } })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('localhost/my-skill:v1.0.0')
    )
  })

  it('shows error toast on failure', async () => {
    mockedDeleteApiV1BetaSkillsBuildsByTag.activateScenario('server-error')

    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationDeleteBuild(), {
      wrapper: Wrapper,
    })

    result.current
      .mutateAsync({ path: { tag: 'localhost/my-skill:v1.0.0' } })
      .catch(() => {})

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to remove build')
  })

  it('invalidates builds list query on success', async () => {
    const { queryClient, Wrapper } = createQueryClientWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMutationDeleteBuild(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({ path: { tag: 'localhost/my-skill:v1.0.0' } })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining([
          expect.objectContaining({ _id: 'getApiV1BetaSkillsBuilds' }),
        ]),
      })
    )
  })

  it('tracks delete build success event with tag', async () => {
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationDeleteBuild(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({ path: { tag: 'localhost/my-skill:v1.0.0' } })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(trackEvent).toHaveBeenCalledWith('Skills: delete build succeeded', {
      tag: 'localhost/my-skill:v1.0.0',
    })
  })

  it('tracks delete build failure event on error', async () => {
    mockedDeleteApiV1BetaSkillsBuildsByTag.activateScenario('server-error')

    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationDeleteBuild(), {
      wrapper: Wrapper,
    })

    result.current
      .mutateAsync({ path: { tag: 'localhost/my-skill:v1.0.0' } })
      .catch(() => {})

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(trackEvent).toHaveBeenCalledWith('Skills: delete build failed', {
      tag: 'localhost/my-skill:v1.0.0',
    })
  })
})
