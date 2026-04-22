import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi, describe, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { toast } from 'sonner'
import { useMutationUninstallSkill } from '../use-mutation-uninstall-skill'
import { recordRequests } from '@/common/mocks/node'
import { mockedDeleteApiV1BetaSkillsByName } from '@/common/mocks/fixtures/skills_name/delete'
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

describe('useMutationUninstallSkill', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear()
  })

  it('sends DELETE to /api/v1beta/skills/{name} with correct path and query params', async () => {
    const rec = recordRequests()
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationUninstallSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({
      path: { name: 'my-skill' },
      query: { scope: 'user' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const deleteCall = rec.recordedRequests.find(
      (r) =>
        r.method === 'DELETE' && r.pathname === '/api/v1beta/skills/my-skill'
    )
    expect(deleteCall).toBeDefined()
    expect(deleteCall?.search).toMatchObject({ scope: 'user' })
  })

  it('shows success toast with skill name on success', async () => {
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationUninstallSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({
      path: { name: 'my-skill' },
      query: { scope: 'user' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith(
      'my-skill uninstalled successfully'
    )
  })

  it('shows error toast on failure', async () => {
    mockedDeleteApiV1BetaSkillsByName.activateScenario('server-error')

    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationUninstallSkill(), {
      wrapper: Wrapper,
    })

    result.current
      .mutateAsync({ path: { name: 'my-skill' }, query: {} })
      .catch(() => {})

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to uninstall skill')
  })

  it('invalidates skills list query on success', async () => {
    const { queryClient, Wrapper } = createQueryClientWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMutationUninstallSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({
      path: { name: 'my-skill' },
      query: { scope: 'user' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining([
          expect.objectContaining({ _id: 'getApiV1BetaSkills' }),
        ]),
      })
    )
  })

  it('tracks uninstall success event with scope and project_root info', async () => {
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationUninstallSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({
      path: { name: 'my-skill' },
      query: { scope: 'project', project_root: '/path/to/project' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(trackEvent).toHaveBeenCalledWith('Skills: uninstall succeeded', {
      skill_name: 'my-skill',
      scope: 'project',
      has_project_root: 'true',
    })
  })

  it('tracks uninstall failure event on error', async () => {
    mockedDeleteApiV1BetaSkillsByName.activateScenario('server-error')

    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationUninstallSkill(), {
      wrapper: Wrapper,
    })

    result.current
      .mutateAsync({ path: { name: 'my-skill' }, query: { scope: 'user' } })
      .catch(() => {})

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(trackEvent).toHaveBeenCalledWith('Skills: uninstall failed', {
      skill_name: 'my-skill',
      scope: 'user',
    })
  })
})
