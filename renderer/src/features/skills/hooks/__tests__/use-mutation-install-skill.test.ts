import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi, describe, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { toast } from 'sonner'
import { useMutationInstallSkill } from '../use-mutation-install-skill'
import { recordRequests } from '@/common/mocks/node'
import { mockedPostApiV1BetaSkills } from '@/common/mocks/fixtures/skills/post'
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

describe('useMutationInstallSkill', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear()
  })

  it('sends POST to /api/v1beta/skills with correct body', async () => {
    const rec = recordRequests()
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationInstallSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({
      body: { name: 'my-skill', scope: 'user' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const postCall = rec.recordedRequests.find(
      (r) => r.method === 'POST' && r.pathname === '/api/v1beta/skills'
    )
    expect(postCall).toBeDefined()
    expect(postCall?.payload).toMatchObject({ name: 'my-skill', scope: 'user' })
  })

  it('shows success toast with skill name from metadata on success', async () => {
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationInstallSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({ body: { name: 'skill-one', scope: 'user' } })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith(
      'skill-one installed successfully'
    )
  })

  it('shows success toast with reference as fallback when metadata.name is absent', async () => {
    mockedPostApiV1BetaSkills.override(() => ({
      skill: {
        reference: 'ghcr.io/org/skill-one:v1',
        status: 'installed',
        scope: 'user',
      },
    }))

    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationInstallSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({
      body: { name: 'ghcr.io/org/skill-one:v1', scope: 'user' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith(
      'ghcr.io/org/skill-one:v1 installed successfully'
    )
  })

  it('rejects with an error on failure', async () => {
    mockedPostApiV1BetaSkills.activateScenario('server-error')

    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationInstallSkill(), {
      wrapper: Wrapper,
    })

    result.current
      .mutateAsync({ body: { name: 'skill', scope: 'user' } })
      .catch(() => {})

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('invalidates skills list query on success', async () => {
    const { queryClient, Wrapper } = createQueryClientWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useMutationInstallSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({ body: { name: 'skill-one', scope: 'user' } })

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

  it('tracks install success event with skill metadata', async () => {
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationInstallSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({
      body: {
        name: 'skill-one',
        scope: 'user',
        version: 'v1.0.0',
        clients: ['vscode', 'cursor'],
      },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(trackEvent).toHaveBeenCalledWith('Skills: install succeeded', {
      skill_name: 'skill-one',
      scope: 'user',
      has_version: 'true',
      clients_count: 2,
    })
  })

  it('tracks install failure event on error', async () => {
    mockedPostApiV1BetaSkills.activateScenario('server-error')

    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationInstallSkill(), {
      wrapper: Wrapper,
    })

    result.current
      .mutateAsync({ body: { name: 'skill-one', scope: 'project' } })
      .catch(() => {})

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(trackEvent).toHaveBeenCalledWith('Skills: install failed', {
      skill_name: 'skill-one',
      scope: 'project',
    })
  })
})
