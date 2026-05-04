import { render, screen, waitFor, within } from '@testing-library/react'
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
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
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
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
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
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
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
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
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
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
    })
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows error alert inside the dialog when build fails', async () => {
    const user = userEvent.setup()
    mockedPostApiV1BetaSkillsBuild.activateScenario('server-error')
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
    })
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('surfaces the backend message verbatim for 400 packager errors', async () => {
    const user = userEvent.setup()
    mockedPostApiV1BetaSkillsBuild.activateScenario('user-error')
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
    })
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('SKILL.md missing')
    })
  })

  it('clears the error alert when the dialog is closed', async () => {
    const user = userEvent.setup()
    mockedPostApiV1BetaSkillsBuild.activateScenario('server-error')
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
    })
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('accepts a manually typed path and submits when isDirectory returns true', async () => {
    const user = userEvent.setup()
    const rec = recordRequests()

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    const pathInput = screen.getByPlaceholderText(/paste or type a folder/i)
    await user.type(pathInput, '/home/user/.agents/my-skill')
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      const postCall = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/skills/build'
      )
      expect(postCall).toBeDefined()
      expect(postCall?.payload).toMatchObject({
        path: '/home/user/.agents/my-skill',
      })
    })

    expect(window.electronAPI.isDirectory).toHaveBeenCalledWith(
      '/home/user/.agents/my-skill'
    )
  })

  it('opens install dialog with reference and version split out of the built name:tag', async () => {
    const user = userEvent.setup()
    mockedPostApiV1BetaSkillsBuild.override(() => ({
      reference: 'ghcr.io/org/skill:v2.0.0',
    }))
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
    })
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })

    // Sonner is globally mocked, so the action button is never rendered.
    // Trigger the "Install now" handler captured by the toast call directly.
    const lastCall = vi.mocked(toast.success).mock.calls.at(-1)
    const opts = lastCall?.[1] as
      | { action?: { onClick?: () => void } }
      | undefined
    opts?.action?.onClick?.()

    const nameInput = await screen.findByLabelText(/name or reference/i)
    expect(nameInput).toHaveValue('ghcr.io/org/skill')

    const installDialog = nameInput.closest(
      '[role="dialog"]'
    ) as HTMLElement | null
    expect(installDialog).not.toBeNull()
    expect(
      within(installDialog!).getByPlaceholderText('e.g. v1.0.0')
    ).toHaveValue('v2.0.0')
  })

  it('falls back to the user-supplied tag as version when the built reference has none', async () => {
    const user = userEvent.setup()
    mockedPostApiV1BetaSkillsBuild.override(() => ({
      reference: 'ghcr.io/org/skill',
    }))
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
    })
    await user.type(screen.getByPlaceholderText(/e\.g\. v1\.0\.0/i), 'v3.4.5')
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })

    const lastCall = vi.mocked(toast.success).mock.calls.at(-1)
    const opts = lastCall?.[1] as
      | { action?: { onClick?: () => void } }
      | undefined
    opts?.action?.onClick?.()

    const nameInput = await screen.findByLabelText(/name or reference/i)
    expect(nameInput).toHaveValue('ghcr.io/org/skill')

    const installDialog = nameInput.closest(
      '[role="dialog"]'
    ) as HTMLElement | null
    expect(installDialog).not.toBeNull()
    expect(
      within(installDialog!).getByPlaceholderText('e.g. v1.0.0')
    ).toHaveValue('v3.4.5')
  })

  it('parses the user-supplied tag before using it as the version fallback', async () => {
    const user = userEvent.setup()
    mockedPostApiV1BetaSkillsBuild.override(() => ({
      reference: 'ghcr.io/org/skill',
    }))
    vi.mocked(window.electronAPI.selectFolder).mockResolvedValue(
      '/home/user/my-skill'
    )

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse for folder/i }))
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/paste or type a folder/i)
      ).toHaveValue('/home/user/my-skill')
    })
    // User typed a full OCI ref into the build form's Tag field. Only
    // the version portion should land in the install dialog's Version
    // field, never the whole conjoined string.
    await user.type(
      screen.getByPlaceholderText(/e\.g\. v1\.0\.0/i),
      'ghcr.io/org/skill:v3.4.5'
    )
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })

    const lastCall = vi.mocked(toast.success).mock.calls.at(-1)
    const opts = lastCall?.[1] as
      | { action?: { onClick?: () => void } }
      | undefined
    opts?.action?.onClick?.()

    const nameInput = await screen.findByLabelText(/name or reference/i)
    expect(nameInput).toHaveValue('ghcr.io/org/skill')

    const installDialog = nameInput.closest(
      '[role="dialog"]'
    ) as HTMLElement | null
    expect(installDialog).not.toBeNull()
    expect(
      within(installDialog!).getByPlaceholderText('e.g. v1.0.0')
    ).toHaveValue('v3.4.5')
  })

  it('blocks submit and shows validation error when typed path is not a directory', async () => {
    const user = userEvent.setup()
    const rec = recordRequests()
    vi.mocked(window.electronAPI.isDirectory).mockResolvedValue(false)

    renderWithProviders(<DialogBuildSkill open onOpenChange={vi.fn()} />)

    const pathInput = screen.getByPlaceholderText(/paste or type a folder/i)
    await user.type(pathInput, '/does/not/exist')
    await user.click(screen.getByRole('button', { name: /^build$/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/path is not a valid folder/i)
      ).toBeInTheDocument()
    })

    const postCall = rec.recordedRequests.find(
      (r) => r.method === 'POST' && r.pathname === '/api/v1beta/skills/build'
    )
    expect(postCall).toBeUndefined()
  })
})
