import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsTabs } from '../settings-tabs'
import { PromptProvider } from '@/common/contexts/prompt/provider'

const mockElectronAPI = {
  platform: 'darwin',
  getMainLogContent: vi.fn(),
  getAppVersion: vi.fn(),
  isReleaseBuild: vi.fn(),
  getToolhiveVersion: vi.fn(),
  isAutoUpdateEnabled: vi.fn(),
  setAutoUpdate: vi.fn(),
  getUpdateState: vi.fn(),
  sentry: {
    isEnabled: vi.fn(),
    optIn: vi.fn(),
    optOut: vi.fn(),
  },
  featureFlags: {
    getAll: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  },
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

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

    mockElectronAPI.getMainLogContent.mockResolvedValue('Mock log content')
    mockElectronAPI.getAppVersion.mockResolvedValue('1.0.0')
    mockElectronAPI.isReleaseBuild.mockResolvedValue(true)
    mockElectronAPI.getToolhiveVersion.mockResolvedValue('0.9.0')
    mockElectronAPI.isAutoUpdateEnabled.mockResolvedValue(false)
    mockElectronAPI.getUpdateState.mockResolvedValue('none')
    mockElectronAPI.sentry.isEnabled.mockResolvedValue(true)
    mockElectronAPI.featureFlags.getAll.mockResolvedValue({})
    mockElectronAPI.featureFlags.enable.mockResolvedValue(undefined)
    mockElectronAPI.featureFlags.disable.mockResolvedValue(undefined)

    // Reset mock return values
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
    expect(screen.getByRole('tab', { name: 'Version' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeVisible()
  })
  it('shows General tab as default active tab', async () => {
    renderWithProviders(<SettingsTabs />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'General Settings' })
      ).toBeVisible()
    })
  })
  it('shows Version tab when clicked', async () => {
    renderWithProviders(<SettingsTabs />)
    await userEvent.click(screen.getByRole('tab', { name: 'Version' }))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Version Information' })
      ).toBeVisible()
    })
  })
  it('shows Logs tab when clicked', async () => {
    renderWithProviders(<SettingsTabs />)

    await userEvent.click(screen.getByRole('tab', { name: 'Logs' }))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Application Logs' })
      ).toBeVisible()
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

    // Check that the ArrowUpCircle icon is present
    const icon = versionTab.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('text-blue-500')
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

    // Check that the icon is not present
    const icon = versionTab.querySelector('svg')
    expect(icon).not.toBeInTheDocument()
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

    // Check that the icon is not present
    const icon = versionTab.querySelector('svg')
    expect(icon).not.toBeInTheDocument()
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

    // Check that these tabs don't have the icon
    expect(generalTab.querySelector('svg')).not.toBeInTheDocument()
    expect(logsTab.querySelector('svg')).not.toBeInTheDocument()
  })
})
