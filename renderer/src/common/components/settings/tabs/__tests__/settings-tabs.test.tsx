import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsTabs } from '../settings-tabs'
import { PromptProvider } from '@/common/contexts/prompt/provider'

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
  beforeEach(() => {
    vi.clearAllMocks()

    mockElectronAPI.getMainLogContent.mockResolvedValue('Mock log content')
    mockElectronAPI.getAppVersion.mockResolvedValue('1.0.0')
    mockElectronAPI.isReleaseBuild.mockResolvedValue(true)
    mockElectronAPI.getToolhiveVersion.mockResolvedValue('0.9.0')
    mockElectronAPI.sentry.isEnabled.mockResolvedValue(true)
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
  it('shows Version tab as default active tab', async () => {
    renderWithProviders(<SettingsTabs />)
    await userEvent.click(screen.getByRole('tab', { name: 'Version' }))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Version Information' })
      ).toBeVisible()
    })
  })
  it('shows Logs tab as default active tab', async () => {
    renderWithProviders(<SettingsTabs />)
    await userEvent.click(screen.getByRole('tab', { name: 'Logs' }))
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Application Logs' })
      ).toBeVisible()
    })
  })
})
