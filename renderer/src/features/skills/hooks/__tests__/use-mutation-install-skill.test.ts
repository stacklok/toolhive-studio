import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { toast } from 'sonner'
import { useMutationInstallSkill } from '../use-mutation-install-skill'
import { recordRequests } from '@/common/mocks/node'
import { mockedPostApiV1BetaSkills } from '@/common/mocks/fixtures/skills/post'

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
})
