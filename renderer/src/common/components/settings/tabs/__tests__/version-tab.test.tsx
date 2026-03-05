import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VersionTab } from '../version-tab'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AppVersionInfo } from '@/common/hooks/use-app-version'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const mockIsAutoUpdateEnabled = vi.fn()
const mockSetAutoUpdate = vi.fn()
const mockManualUpdate = vi.fn()
const mockGetUpdateState = vi.fn()

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  // Set default query data for useCurrentUpdateState and useAutoUpdateStatus
  queryClient.setQueryData(['update-state'], 'none')
  queryClient.setQueryData(['auto-update-enabled'], true)

  return render(
    <PromptProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </PromptProvider>
  )
}

const mockAppInfo: AppVersionInfo = {
  currentVersion: '1.0.0',
  latestVersion: '',
  isNewVersionAvailable: false,
  isReleaseBuild: true,
  toolhiveVersion: '0.9.0',
}

describe('VersionTab', () => {
  const originalEnv = import.meta.env.MODE

  beforeEach(() => {
    window.electronAPI.isAutoUpdateEnabled = mockIsAutoUpdateEnabled
    window.electronAPI.setAutoUpdate = mockSetAutoUpdate
    window.electronAPI.manualUpdate = mockManualUpdate
    window.electronAPI.getUpdateState = mockGetUpdateState
    window.electronAPI.isLinux = false

    mockIsAutoUpdateEnabled.mockResolvedValue(true)
    mockGetUpdateState.mockResolvedValue('none')
    vi.stubGlobal('open', vi.fn())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    import.meta.env.MODE = originalEnv
  })

  it('renders version heading', () => {
    renderWithProviders(
      <VersionTab appInfo={mockAppInfo} isLoading={false} error={null} />
    )

    expect(screen.getByText('Version')).toBeVisible()
  })

  it('displays version information when loaded', () => {
    renderWithProviders(
      <VersionTab appInfo={mockAppInfo} isLoading={false} error={null} />
    )

    expect(screen.getByText('Desktop UI version')).toBeVisible()
    expect(screen.getByText('ToolHive binary version')).toBeVisible()
    expect(screen.getByText('Build type')).toBeVisible()
    expect(screen.getByText(/1\.0\.0/)).toBeVisible()
    expect(screen.getByText('0.9.0')).toBeVisible()
    expect(screen.getByText('Release')).toBeVisible()
  })

  it('displays development build type when not a release build', () => {
    const devAppInfo: AppVersionInfo = {
      ...mockAppInfo,
      isReleaseBuild: false,
    }

    renderWithProviders(
      <VersionTab appInfo={devAppInfo} isLoading={false} error={null} />
    )

    expect(screen.getByText('Development')).toBeVisible()
  })

  it('handles error when fetching version info', () => {
    const error = new Error('Failed to fetch')

    renderWithProviders(
      <VersionTab appInfo={undefined} isLoading={false} error={error} />
    )

    expect(screen.getByText('Failed to load version information')).toBeVisible()
  })

  it('displays loading state', () => {
    renderWithProviders(
      <VersionTab appInfo={undefined} isLoading={true} error={null} />
    )

    expect(screen.getByText('Loading version information...')).toBeVisible()
  })

  it('displays version badges with correct variants', () => {
    renderWithProviders(
      <VersionTab appInfo={mockAppInfo} isLoading={false} error={null} />
    )

    const badges = screen.getAllByText((content, element) => {
      return (
        element?.tagName === 'SPAN' &&
        (content.includes('1.0.0') ||
          content === '0.9.0' ||
          content === 'Release')
      )
    })

    expect(badges).toHaveLength(3)
  })

  it('displays latest version label when no update is available', () => {
    const appInfoLatest: AppVersionInfo = {
      ...mockAppInfo,
      isNewVersionAvailable: false,
    }

    renderWithProviders(
      <VersionTab appInfo={appInfoLatest} isLoading={false} error={null} />
    )

    expect(screen.getAllByText('Latest')).toHaveLength(2)
  })

  it('does not display latest version label when update is available', () => {
    const appInfoNotLatest: AppVersionInfo = {
      ...mockAppInfo,
      isNewVersionAvailable: true,
    }

    renderWithProviders(
      <VersionTab appInfo={appInfoNotLatest} isLoading={false} error={null} />
    )

    expect(screen.queryByText('Latest')).not.toBeInTheDocument()
  })

  it('displays empty toolhive version when not provided', () => {
    const appInfoWithEmptyToolhive: AppVersionInfo = {
      ...mockAppInfo,
      toolhiveVersion: '',
    }

    renderWithProviders(
      <VersionTab
        appInfo={appInfoWithEmptyToolhive}
        isLoading={false}
        error={null}
      />
    )

    expect(screen.getByText('ToolHive binary version')).toBeVisible()
  })

  it('show update available alert', () => {
    import.meta.env.MODE = 'production'

    const appInfoWithUpdate: AppVersionInfo = {
      ...mockAppInfo,
      latestVersion: '2.0.0',
      isNewVersionAvailable: true,
    }

    renderWithProviders(
      <VersionTab appInfo={appInfoWithUpdate} isLoading={false} error={null} />
    )

    expect(screen.getByText(/A new version 2.0.0 is available/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Download' })).toBeVisible()
    expect(screen.getByText('ToolHive binary version')).toBeVisible()
  })

  it('calls window.open on Linux when Download button is clicked', async () => {
    import.meta.env.MODE = 'production'
    window.electronAPI.isLinux = true
    const user = userEvent.setup()

    const appInfoWithUpdate: AppVersionInfo = {
      ...mockAppInfo,
      latestVersion: '2.0.0',
      isNewVersionAvailable: true,
    }

    renderWithProviders(
      <VersionTab appInfo={appInfoWithUpdate} isLoading={false} error={null} />
    )

    const downloadButton = screen.getByRole('button', { name: 'Download' })
    await user.click(downloadButton)

    expect(window.open).toHaveBeenCalledWith(
      'https://github.com/stacklok/toolhive-studio/releases/latest'
    )
    expect(mockManualUpdate).not.toHaveBeenCalled()
  })

  it('calls manualUpdate on non-Linux when Download button is clicked', async () => {
    import.meta.env.MODE = 'production'
    const user = userEvent.setup()

    const appInfoWithUpdate: AppVersionInfo = {
      ...mockAppInfo,
      latestVersion: '2.0.0',
      isNewVersionAvailable: true,
    }

    renderWithProviders(
      <VersionTab appInfo={appInfoWithUpdate} isLoading={false} error={null} />
    )

    const downloadButton = screen.getByRole('button', { name: 'Download' })
    await user.click(downloadButton)

    expect(mockManualUpdate).toHaveBeenCalled()
    expect(window.open).not.toHaveBeenCalled()
  })

  it('does not show update alert in development mode', () => {
    import.meta.env.MODE = 'development'

    const appInfoWithUpdate: AppVersionInfo = {
      ...mockAppInfo,
      latestVersion: '2.0.0',
      isNewVersionAvailable: true,
    }

    renderWithProviders(
      <VersionTab appInfo={appInfoWithUpdate} isLoading={false} error={null} />
    )

    expect(
      screen.queryByText(/A new version 2.0.0 is available/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Download' })
    ).not.toBeInTheDocument()
  })

  it('shows update alert in production mode when update is available', () => {
    import.meta.env.MODE = 'production'

    const appInfoWithUpdate: AppVersionInfo = {
      ...mockAppInfo,
      latestVersion: '2.0.0',
      isNewVersionAvailable: true,
    }

    renderWithProviders(
      <VersionTab appInfo={appInfoWithUpdate} isLoading={false} error={null} />
    )

    expect(screen.getByText(/A new version 2.0.0 is available/i)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Download' })).toBeVisible()
  })

  it('does not show update alert in production mode when no update is available', () => {
    import.meta.env.MODE = 'production'

    const appInfoNoUpdate: AppVersionInfo = {
      ...mockAppInfo,
      isNewVersionAvailable: false,
    }

    renderWithProviders(
      <VersionTab appInfo={appInfoNoUpdate} isLoading={false} error={null} />
    )

    expect(
      screen.queryByText(/A new version .* is available/i)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Download' })
    ).not.toBeInTheDocument()
  })

  it('shows "Checking..." and toast notification when update state is not-available', () => {
    import.meta.env.MODE = 'production'

    const appInfoWithUpdate: AppVersionInfo = {
      ...mockAppInfo,
      latestVersion: '2.0.0',
      isNewVersionAvailable: true,
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    queryClient.setQueryData(['update-state'], 'not-available')
    queryClient.setQueryData(['auto-update-enabled'], true)

    render(
      <PromptProvider>
        <QueryClientProvider client={queryClient}>
          <VersionTab
            appInfo={appInfoWithUpdate}
            isLoading={false}
            error={null}
          />
        </QueryClientProvider>
      </PromptProvider>
    )

    const button = screen.getByRole('button', { name: /Checking/i })
    expect(button).toBeVisible()
    expect(button).toBeDisabled()

    expect(toast.info).toHaveBeenCalledWith('Update not yet available', {
      id: 'update-not-available',
      description:
        'The update server is still processing the latest release. Please try again in a few minutes.',
      duration: 6000,
    })
  })

  it('shows "Checking..." when update state is checking', () => {
    import.meta.env.MODE = 'production'

    const appInfoWithUpdate: AppVersionInfo = {
      ...mockAppInfo,
      latestVersion: '2.0.0',
      isNewVersionAvailable: true,
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    queryClient.setQueryData(['update-state'], 'checking')
    queryClient.setQueryData(['auto-update-enabled'], true)

    render(
      <PromptProvider>
        <QueryClientProvider client={queryClient}>
          <VersionTab
            appInfo={appInfoWithUpdate}
            isLoading={false}
            error={null}
          />
        </QueryClientProvider>
      </PromptProvider>
    )

    const button = screen.getByRole('button', { name: /Checking/i })
    expect(button).toBeVisible()
    expect(button).toBeDisabled()
  })

  it('shows "Downloading..." when update state is downloading', () => {
    import.meta.env.MODE = 'production'

    const appInfoWithUpdate: AppVersionInfo = {
      ...mockAppInfo,
      latestVersion: '2.0.0',
      isNewVersionAvailable: true,
    }

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    queryClient.setQueryData(['update-state'], 'downloading')
    queryClient.setQueryData(['auto-update-enabled'], true)

    render(
      <PromptProvider>
        <QueryClientProvider client={queryClient}>
          <VersionTab
            appInfo={appInfoWithUpdate}
            isLoading={false}
            error={null}
          />
        </QueryClientProvider>
      </PromptProvider>
    )

    const button = screen.getByRole('button', { name: /Downloading/i })
    expect(button).toBeVisible()
    expect(button).toBeDisabled()
  })
})
