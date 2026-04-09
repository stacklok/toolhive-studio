import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi, describe } from 'vitest'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { DialogDeleteBuild } from '../dialog-delete-build'
import { recordRequests } from '@/common/mocks/node'
import { mockedDeleteApiV1BetaSkillsBuildsByTag } from '@/common/mocks/fixtures/skills_builds_tag/delete'
import type { GithubComStacklokToolhivePkgSkillsLocalBuild as LocalBuild } from '@common/api/generated/types.gen'

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

const testBuild: LocalBuild = {
  name: 'my-skill',
  tag: 'localhost/my-skill:v1.0.0',
  version: 'v1.0.0',
  digest: 'sha256:abc123',
}

describe('DialogDeleteBuild', () => {
  it('shows build name in confirmation text', () => {
    renderWithProviders(
      <DialogDeleteBuild open onOpenChange={vi.fn()} build={testBuild} />
    )

    expect(screen.getByText(/my-skill/)).toBeInTheDocument()
  })

  it('sends DELETE to /api/v1beta/skills/builds/{tag} on confirm', async () => {
    const user = userEvent.setup()
    const rec = recordRequests()

    renderWithProviders(
      <DialogDeleteBuild open onOpenChange={vi.fn()} build={testBuild} />
    )

    await user.click(screen.getByRole('button', { name: /^remove$/i }))

    await waitFor(() => {
      const deleteCall = rec.recordedRequests.find(
        (r) =>
          r.method === 'DELETE' &&
          r.pathname.includes('/api/v1beta/skills/builds/')
      )
      expect(deleteCall).toBeDefined()
      expect(deleteCall?.pathname).toContain('localhost%2Fmy-skill%3Av1.0.0')
    })
  })

  it('calls onOpenChange(false) after successful removal', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    renderWithProviders(
      <DialogDeleteBuild open onOpenChange={onOpenChange} build={testBuild} />
    )

    await user.click(screen.getByRole('button', { name: /^remove$/i }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('Cancel button calls onOpenChange(false) without sending request', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const rec = recordRequests()

    renderWithProviders(
      <DialogDeleteBuild open onOpenChange={onOpenChange} build={testBuild} />
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    const deleteCall = rec.recordedRequests.find((r) => r.method === 'DELETE')
    expect(deleteCall).toBeUndefined()
  })

  it('shows error state when deletion fails', async () => {
    mockedDeleteApiV1BetaSkillsBuildsByTag.activateScenario('server-error')
    const user = userEvent.setup()

    renderWithProviders(
      <DialogDeleteBuild open onOpenChange={vi.fn()} build={testBuild} />
    )

    await user.click(screen.getByRole('button', { name: /^remove$/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^remove$/i })
      ).not.toBeDisabled()
    })
  })
})
