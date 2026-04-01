import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi, describe } from 'vitest'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { DialogUninstallSkill } from '../dialog-uninstall-skill'
import { recordRequests } from '@/common/mocks/node'
import type { GithubComStacklokToolhivePkgSkillsInstalledSkill as InstalledSkill } from '@common/api/generated/types.gen'

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

const testSkill: InstalledSkill = {
  reference: 'ghcr.io/org/my-skill:v1',
  status: 'installed',
  scope: 'user',
  metadata: {
    name: 'my-skill',
  },
}

describe('DialogUninstallSkill', () => {
  it('shows skill name in confirmation text', () => {
    renderWithProviders(
      <DialogUninstallSkill open onOpenChange={vi.fn()} skill={testSkill} />
    )

    expect(screen.getByText(/my-skill/)).toBeInTheDocument()
  })

  it('sends DELETE request with correct path and query on confirm', async () => {
    const user = userEvent.setup()
    const rec = recordRequests()

    renderWithProviders(
      <DialogUninstallSkill open onOpenChange={vi.fn()} skill={testSkill} />
    )

    await user.click(screen.getByRole('button', { name: /^uninstall$/i }))

    await waitFor(() => {
      const deleteCall = rec.recordedRequests.find(
        (r) =>
          r.method === 'DELETE' && r.pathname === '/api/v1beta/skills/my-skill'
      )
      expect(deleteCall).toBeDefined()
      expect(deleteCall?.search).toMatchObject({ scope: 'user' })
    })
  })

  it('calls onOpenChange(false) after successful uninstall', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    renderWithProviders(
      <DialogUninstallSkill
        open
        onOpenChange={onOpenChange}
        skill={testSkill}
      />
    )

    await user.click(screen.getByRole('button', { name: /^uninstall$/i }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('Cancel button calls onOpenChange(false) without sending request', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const rec = recordRequests()

    renderWithProviders(
      <DialogUninstallSkill
        open
        onOpenChange={onOpenChange}
        skill={testSkill}
      />
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    const deleteCall = rec.recordedRequests.find((r) => r.method === 'DELETE')
    expect(deleteCall).toBeUndefined()
  })
})
