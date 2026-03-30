import { renderHook, waitFor } from '@testing-library/react'
import { expect, it, describe } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { toast } from 'sonner'
import { useMutationBuildSkill } from '../use-mutation-build-skill'
import { recordRequests } from '@/common/mocks/node'
import { mockedPostApiV1BetaSkillsBuild } from '@/common/mocks/fixtures/skills_build/post'

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

describe('useMutationBuildSkill', () => {
  it('sends POST to /api/v1beta/skills/build with correct body', async () => {
    const rec = recordRequests()
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationBuildSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({
      body: { path: '/home/user/my-skill', tag: 'v1.0.0' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const postCall = rec.recordedRequests.find(
      (r) => r.method === 'POST' && r.pathname === '/api/v1beta/skills/build'
    )
    expect(postCall).toBeDefined()
    expect(postCall?.payload).toMatchObject({
      path: '/home/user/my-skill',
      tag: 'v1.0.0',
    })
  })

  it('returns build result with reference', async () => {
    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationBuildSkill(), {
      wrapper: Wrapper,
    })

    result.current.mutateAsync({ body: { path: '/home/user/my-skill' } })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.reference).toBe('ghcr.io/org/skill-one:v1')
  })

  it('shows error toast on failure', async () => {
    mockedPostApiV1BetaSkillsBuild.activateScenario('server-error')

    const { Wrapper } = createQueryClientWrapper()

    const { result } = renderHook(() => useMutationBuildSkill(), {
      wrapper: Wrapper,
    })

    result.current
      .mutateAsync({ body: { path: '/home/user/my-skill' } })
      .catch(() => {})

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to build skill')
  })
})
