import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsTabs } from '../settings-tabs'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'

// Mock all the tab components
vi.mock('../general-tab', () => ({
  GeneralTab: () => <div data-testid="general-tab">General Tab Content</div>,
}))

vi.mock('../version-tab', () => ({
  VersionTab: () => <div data-testid="version-tab">Version Tab Content</div>,
}))

vi.mock('../logs-tab', () => ({
  LogsTab: () => <div data-testid="logs-tab">Logs Tab Content</div>,
}))

// Mock electron API
const mockElectronAPI = {
  platform: 'darwin',
  getMainLogContent: vi.fn(),
  getAppVersion: vi.fn(),
  isReleaseBuild: vi.fn(),
  getToolhiveVersion: vi.fn(),
  sentry: {
    isEnabled: vi.fn(),
    optIn: vi.fn(),
    optOut: vi.fn(),
  },
  quitApp: vi.fn(),
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

// Mock hooks
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

vi.mock('@/common/hooks/use-confirm-quit', () => ({
  useConfirmQuit: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(true)),
}))

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <ConfirmProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </ConfirmProvider>
  )
}

describe('SettingsTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    mockElectronAPI.getMainLogContent.mockResolvedValue('Mock log content')
    mockElectronAPI.getAppVersion.mockResolvedValue('1.0.0')
    mockElectronAPI.isReleaseBuild.mockResolvedValue(true)
    mockElectronAPI.getToolhiveVersion.mockResolvedValue('0.9.0')
    mockElectronAPI.sentry.isEnabled.mockResolvedValue(true)
  })

  it('renders all tab triggers', async () => {
    renderWithProviders(<SettingsTabs />)

    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Version' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeInTheDocument()
  })

  it('shows General tab as default active tab', async () => {
    renderWithProviders(<SettingsTabs />)

    const generalTab = screen.getByRole('tab', { name: 'General' })
    expect(generalTab).toHaveAttribute('data-state', 'active')

    expect(screen.getByTestId('general-tab')).toBeVisible()
    expect(screen.queryByTestId('version-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('logs-tab')).not.toBeInTheDocument()
  })

  it('switches to Version tab when clicked', async () => {
    renderWithProviders(<SettingsTabs />)

    const versionTab = screen.getByRole('tab', { name: 'Version' })
    await userEvent.click(versionTab)

    await waitFor(() => {
      expect(versionTab).toHaveAttribute('data-state', 'active')
    })

    expect(screen.getByTestId('version-tab')).toBeVisible()
    expect(screen.queryByTestId('general-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('logs-tab')).not.toBeInTheDocument()
  })

  it('switches to Logs tab when clicked', async () => {
    renderWithProviders(<SettingsTabs />)

    const logsTab = screen.getByRole('tab', { name: 'Logs' })
    await userEvent.click(logsTab)

    await waitFor(() => {
      expect(logsTab).toHaveAttribute('data-state', 'active')
    })

    expect(screen.getByTestId('logs-tab')).toBeVisible()
    expect(screen.queryByTestId('general-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('version-tab')).not.toBeInTheDocument()
  })

  it('can navigate between tabs', async () => {
    renderWithProviders(<SettingsTabs />)

    // Start with General tab active
    expect(screen.getByTestId('general-tab')).toBeVisible()

    // Click Version tab
    const versionTab = screen.getByRole('tab', { name: 'Version' })
    await userEvent.click(versionTab)

    await waitFor(() => {
      expect(screen.getByTestId('version-tab')).toBeVisible()
    })

    // Click Logs tab
    const logsTab = screen.getByRole('tab', { name: 'Logs' })
    await userEvent.click(logsTab)

    await waitFor(() => {
      expect(screen.getByTestId('logs-tab')).toBeVisible()
    })

    // Go back to General tab
    const generalTab = screen.getByRole('tab', { name: 'General' })
    await userEvent.click(generalTab)

    await waitFor(() => {
      expect(screen.getByTestId('general-tab')).toBeVisible()
    })
  })

  it('uses vertical orientation for tabs', async () => {
    renderWithProviders(<SettingsTabs />)

    const tabsList = screen.getByRole('tablist')
    expect(tabsList).toHaveAttribute('data-orientation', 'vertical')
  })

  it('applies correct styling classes to tabs layout', async () => {
    renderWithProviders(<SettingsTabs />)

    const tabsList = screen.getByRole('tablist')
    expect(tabsList).toHaveClass(
      'flex',
      'h-fit',
      'w-48',
      'shrink-0',
      'flex-col',
      'gap-2'
    )
  })

  it('maintains tab content in proper containers', async () => {
    renderWithProviders(<SettingsTabs />)

    // Check that each tab content is in a proper tabpanel
    const generalPanel = screen.getByRole('tabpanel', { name: 'General' })
    const versionPanel = screen.getByRole('tabpanel', {
      name: 'Version',
      hidden: true,
    })
    const logsPanel = screen.getByRole('tabpanel', {
      name: 'Logs',
      hidden: true,
    })

    expect(generalPanel).toBeInTheDocument()
    expect(versionPanel).toBeInTheDocument()
    expect(logsPanel).toBeInTheDocument()
  })

  it('keyboard navigation works correctly', async () => {
    renderWithProviders(<SettingsTabs />)

    const generalTab = screen.getByRole('tab', { name: 'General' })
    const versionTab = screen.getByRole('tab', { name: 'Version' })
    const logsTab = screen.getByRole('tab', { name: 'Logs' })

    // Focus on the first tab
    generalTab.focus()
    expect(document.activeElement).toBe(generalTab)

    // Arrow down should move to next tab
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(versionTab)

    // Arrow down again should move to next tab
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(logsTab)

    // Arrow up should go back
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(versionTab)
  })

  it('Enter key activates focused tab', async () => {
    renderWithProviders(<SettingsTabs />)

    const versionTab = screen.getByRole('tab', { name: 'Version' })

    // Focus and activate with Enter
    versionTab.focus()
    await userEvent.keyboard('{Enter}')

    await waitFor(() => {
      expect(versionTab).toHaveAttribute('data-state', 'active')
      expect(screen.getByTestId('version-tab')).toBeVisible()
    })
  })

  it('Space key activates focused tab', async () => {
    renderWithProviders(<SettingsTabs />)

    const logsTab = screen.getByRole('tab', { name: 'Logs' })

    // Focus and activate with Space
    logsTab.focus()
    await userEvent.keyboard(' ')

    await waitFor(() => {
      expect(logsTab).toHaveAttribute('data-state', 'active')
      expect(screen.getByTestId('logs-tab')).toBeVisible()
    })
  })
})
