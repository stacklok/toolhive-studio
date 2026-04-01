import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi, describe } from 'vitest'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { toast } from 'sonner'
import { DialogBuildSkill } from '../dialog-build-skill'
import { recordRequests } from '@/common/mocks/node'
import { mockedPostApiV1BetaSkillsBuild } from '@/common/mocks/fixtures/skills_build/post'

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

describe('DialogBuildSkill', () => {
  it('renders path and tag fields', () => {
    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    expect(screen.getByText(/^path$/i)).toBeInTheDocument()
    expect(screen.getByText(/^tag/i)).toBeInTheDocument()
  })

  it('shows validation error when path is empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(screen.getByText(/path is required/i)).toBeInTheDocument()
    })
  })

  it('native folder picker sets path value', async () => {
    const user = userEvent.setup()
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/select a directory/i)).toHaveValue(
        '/home/user/my-skill'
      )
    })
  })

  it('sends POST to /api/v1beta/skills/build with correct body', async () => {
    const user = userEvent.setup()
    const rec = recordRequests()
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/select a directory/i)).toHaveValue(
        '/home/user/my-skill'
      )
    })

    await user.type(screen.getByPlaceholderText(/e\.g\. v1\.0\.0/i), 'v1.0.0')
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      const postCall = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/skills/build'
      )
      expect(postCall).toBeDefined()
      expect(postCall?.payload).toMatchObject({
        path: '/home/user/my-skill',
        tag: 'v1.0.0',
      })
    })
  })

  it('shows success toast with reference after build', async () => {
    const user = userEvent.setup()
    mockedPostApiV1BetaSkillsBuild.override(() => ({
      reference: 'ghcr.io/org/skill:v1',
    }))
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/select a directory/i)).toHaveValue(
        '/home/user/my-skill'
      )
    })
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('ghcr.io/org/skill:v1'),
        expect.any(Object)
      )
    })
  })

  it('shows generic success toast when no reference returned', async () => {
    const user = userEvent.setup()
    mockedPostApiV1BetaSkillsBuild.override(() => ({}))
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/select a directory/i)).toHaveValue(
        '/home/user/my-skill'
      )
    })
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Skill built successfully')
    })
  })

  it('calls onOpenChange(false) after successful build', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/select a directory/i)).toHaveValue(
        '/home/user/my-skill'
      )
    })
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
