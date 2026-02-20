import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsTabs } from '../settings-tabs'
import { PromptProvider } from '@/common/contexts/prompt/provider'

const mockGetMainLogContent = vi.fn()
const mockGetAppVersion = vi.fn()
const mockIsOfficialReleaseBuild = vi.fn()
const mockGetToolhiveVersion = vi.fn()
const mockIsAutoUpdateEnabled = vi.fn()
const mockSetAutoUpdate = vi.fn()
const mockGetUpdateState = vi.fn()
const mockSentryIsEnabled = vi.fn()
const mockSentryOptIn = vi.fn()
const mockSentryOptOut = vi.fn()

vi.mock('@/common/hooks/use-auto-launch', () => ({
  useAutoLaunchStatus: vi.fn().mockReturnValue({
    data: false,
    isLoading: false,
  }),
  useSetAutoLaunch: vi.fn().mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/common/hooks/use-auto-update', () => ({
  useAutoUpdateStatus: vi.fn().mockReturnValue({
    data: false,
    isLoading: false,
  }),
  useSetAutoUpdate: vi.fn().mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/common/hooks/use-theme', () => ({
  useTheme: vi.fn().mockReturnValue({
    theme: 'system',
    setTheme: vi.fn().mockResolvedValue(undefined),
  }),
}))

const mockUseAppVersion = vi.fn()
const mockUseCurrentUpdateState = vi.fn()

vi.mock('@/common/hooks/use-app-version', () => ({
  useAppVersion: () => mockUseAppVersion(),
  useCurrentUpdateState: () => mockUseCurrentUpdateState(),
}))

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <PromptProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </PromptProvider>
  )
}

describe('SettingsTabs', () => {
  const originalEnv = import.meta.env.MODE

  beforeEach(() => {
    vi.clearAllMocks()

    window.electronAPI.platform = 'darwin'
    window.electronAPI.getMainLogContent = mockGetMainLogContent
    window.electronAPI.getAppVersion = mockGetAppVersion
    window.electronAPI.isOfficialReleaseBuild = mockIsOfficialReleaseBuild
    window.electronAPI.getToolhiveVersion = mockGetToolhiveVersion
    window.electronAPI.isAutoUpdateEnabled = mockIsAutoUpdateEnabled
    window.electronAPI.setAutoUpdate = mockSetAutoUpdate
    window.electronAPI.getUpdateState = mockGetUpdateState
    window.electronAPI.sentry = {
      isEnabled: mockSentryIsEnabled,
      optIn: mockSentryOptIn,
      optOut: mockSentryOptOut,
    } as typeof window.electronAPI.sentry
    window.electronAPI.getSkipQuitConfirmation = vi
      .fn()
      .mockResolvedValue(false)
    window.electronAPI.setSkipQuitConfirmation = vi
      .fn()
      .mockResolvedValue(undefined)

    mockGetMainLogContent.mockResolvedValue('Mock log content')
    mockGetAppVersion.mockResolvedValue('1.0.0')
    mockIsOfficialReleaseBuild.mockResolvedValue(true)
    mockGetToolhiveVersion.mockResolvedValue('0.9.0')
    mockIsAutoUpdateEnabled.mockResolvedValue(false)
    mockGetUpdateState.mockResolvedValue('none')
    mockSentryIsEnabled.mockResolvedValue(true)

    mockUseAppVersion.mockReturnValue({
      data: {
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        isNewVersionAvailable: false,
        isReleaseBuild: true,
        toolhiveVersion: '0.9.0',
      },
      isLoading: false,
      error: null,
    })

    mockUseCurrentUpdateState.mockReturnValue({
      data: 'none',
      isLoading: false,
    })
  })

  afterEach(() => {
    cleanup()
    import.meta.env.MODE = originalEnv
  })

  it('renders all tab triggers', async () => {
    renderWithProviders(<SettingsTabs />)
    expect(screen.getByRole('tab', { name: 'General' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Registry' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Version' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeVisible()
  })
  it('shows General tab as default active tab', async () => {
    renderWithProviders(<SettingsTabs />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'General' })).toBeVisible()
    })
  })
  it('shows Version tab when clicked', async () => {
    renderWithProviders(<SettingsTabs />)
    await userEvent.click(screen.getByRole('tab', { name: 'Version' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Version' })).toBeVisible()
    })
  })
  it('shows Logs tab when clicked', async () => {
    renderWithProviders(<SettingsTabs />)

    await userEvent.click(screen.getByRole('tab', { name: 'Logs' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Logs' })).toBeVisible()
    })
  })

  it('shows update icon on Version tab in production when new version is available', async () => {
    import.meta.env.MODE = 'production'
    mockUseAppVersion.mockReturnValue({
      data: {
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        isNewVersionAvailable: true,
        isReleaseBuild: true,
        toolhiveVersion: '0.9.0',
      },
      isLoading: false,
      error: null,
    })

    renderWithProviders(<SettingsTabs />)

    const versionTab = screen.getByRole('tab', { name: /Version/i })
    expect(versionTab).toBeVisible()

    const updateIcon = versionTab.querySelector('svg.text-blue-500')
    expect(updateIcon).toBeInTheDocument()
  })

  it('does not show update icon on Version tab in development mode', async () => {
    import.meta.env.MODE = 'development'
    mockUseAppVersion.mockReturnValue({
      data: {
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        isNewVersionAvailable: true,
        isReleaseBuild: true,
        toolhiveVersion: '0.9.0',
      },
      isLoading: false,
      error: null,
    })

    renderWithProviders(<SettingsTabs />)

    const versionTab = screen.getByRole('tab', { name: /Version/i })
    expect(versionTab).toBeVisible()

    const updateIcon = versionTab.querySelector('svg.text-blue-500')
    expect(updateIcon).not.toBeInTheDocument()
  })

  it('does not show update icon on Version tab when no update is available', async () => {
    import.meta.env.MODE = 'production'
    mockUseAppVersion.mockReturnValue({
      data: {
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        isNewVersionAvailable: false,
        isReleaseBuild: true,
        toolhiveVersion: '0.9.0',
      },
      isLoading: false,
      error: null,
    })

    renderWithProviders(<SettingsTabs />)

    const versionTab = screen.getByRole('tab', { name: /Version/i })
    expect(versionTab).toBeVisible()

    const updateIcon = versionTab.querySelector('svg.text-blue-500')
    expect(updateIcon).not.toBeInTheDocument()
  })

  it('does not show update icon on other tabs', async () => {
    import.meta.env.MODE = 'production'
    mockUseAppVersion.mockReturnValue({
      data: {
        currentVersion: '1.0.0',
        latestVersion: '2.0.0',
        isNewVersionAvailable: true,
        isReleaseBuild: true,
        toolhiveVersion: '0.9.0',
      },
      isLoading: false,
      error: null,
    })

    renderWithProviders(<SettingsTabs />)

    const generalTab = screen.getByRole('tab', { name: 'General' })
    const logsTab = screen.getByRole('tab', { name: 'Logs' })

    expect(
      generalTab.querySelector('svg.text-blue-500')
    ).not.toBeInTheDocument()
    expect(logsTab.querySelector('svg.text-blue-500')).not.toBeInTheDocument()
  })
})
