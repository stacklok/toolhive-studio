import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GeneralTab } from '../general-tab'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'

// Mock hooks
vi.mock('@/common/hooks/use-auto-launch', () => ({
  useAutoLaunchStatus: vi.fn(),
  useSetAutoLaunch: vi.fn(),
}))

vi.mock('@/common/hooks/use-confirm-quit', () => ({
  useConfirmQuit: vi.fn(),
}))

// Mock electron API
const mockElectronAPI = {
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

describe('GeneralTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Setup default mocks
    const { useAutoLaunchStatus, useSetAutoLaunch } = await import(
      '@/common/hooks/use-auto-launch'
    )
    const { useConfirmQuit } = await import('@/common/hooks/use-confirm-quit')

    vi.mocked(useAutoLaunchStatus).mockReturnValue({
      data: false,
      isLoading: false,
    })

    vi.mocked(useSetAutoLaunch).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    })

    vi.mocked(useConfirmQuit).mockReturnValue(vi.fn().mockResolvedValue(true))

    mockElectronAPI.sentry.isEnabled.mockResolvedValue(true)
    mockElectronAPI.sentry.optIn.mockResolvedValue(true)
    mockElectronAPI.sentry.optOut.mockResolvedValue(false)
  })

  it('renders all settings sections', async () => {
    renderWithProviders(<GeneralTab />)

    expect(screen.getByText('General Settings')).toBeInTheDocument()
    expect(screen.getByText('Start on login')).toBeInTheDocument()
    expect(screen.getByText('Error reporting')).toBeInTheDocument()
    expect(screen.getByText('Skip quit confirmation')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Quit ToolHive' })
    ).toBeInTheDocument()
  })

  it('handles auto-launch toggle', async () => {
    const mockSetAutoLaunch = vi.fn().mockResolvedValue(undefined)
    const { useSetAutoLaunch } = await import('@/common/hooks/use-auto-launch')

    vi.mocked(useSetAutoLaunch).mockReturnValue({
      mutateAsync: mockSetAutoLaunch,
      isPending: false,
    })

    renderWithProviders(<GeneralTab />)

    const autoLaunchSwitch = screen.getByRole('switch', {
      name: /start on login/i,
    })
    await userEvent.click(autoLaunchSwitch)

    expect(mockSetAutoLaunch).toHaveBeenCalledWith(true)
  })

  it('handles telemetry toggle - opt out', async () => {
    renderWithProviders(<GeneralTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: /error reporting/i })
      ).toBeInTheDocument()
    })

    const telemetrySwitch = screen.getByRole('switch', {
      name: /error reporting/i,
    })
    await userEvent.click(telemetrySwitch)

    await waitFor(() => {
      expect(mockElectronAPI.sentry.optOut).toHaveBeenCalled()
    })
  })

  it('handles telemetry toggle - opt in', async () => {
    mockElectronAPI.sentry.isEnabled.mockResolvedValue(false)

    renderWithProviders(<GeneralTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: /error reporting/i })
      ).toBeInTheDocument()
    })

    const telemetrySwitch = screen.getByRole('switch', {
      name: /error reporting/i,
    })
    await userEvent.click(telemetrySwitch)

    await waitFor(() => {
      expect(mockElectronAPI.sentry.optIn).toHaveBeenCalled()
    })
  })

  it('handles quit confirmation toggle', async () => {
    renderWithProviders(<GeneralTab />)

    const quitConfirmationSwitch = screen.getByRole('switch', {
      name: /skip quit confirmation/i,
    })

    // Initially should be false (not skipping confirmation)
    expect(quitConfirmationSwitch).not.toBeChecked()

    await userEvent.click(quitConfirmationSwitch)

    // Should now be checked (skipping confirmation)
    expect(quitConfirmationSwitch).toBeChecked()
    expect(localStorage.getItem('doNotShowAgain_confirm_quit')).toBe('true')
  })

  it('handles quit confirmation toggle - disable skip', async () => {
    // Start with skip enabled
    localStorage.setItem('doNotShowAgain_confirm_quit', 'true')

    renderWithProviders(<GeneralTab />)

    await waitFor(() => {
      const quitConfirmationSwitch = screen.getByRole('switch', {
        name: /skip quit confirmation/i,
      })
      expect(quitConfirmationSwitch).toBeChecked()
    })

    const quitConfirmationSwitch = screen.getByRole('switch', {
      name: /skip quit confirmation/i,
    })
    await userEvent.click(quitConfirmationSwitch)

    expect(quitConfirmationSwitch).not.toBeChecked()
    expect(localStorage.getItem('doNotShowAgain_confirm_quit')).toBeNull()
  })

  it('handles quit button click', async () => {
    const mockConfirmQuit = vi.fn().mockResolvedValue(true)
    const { useConfirmQuit } = await import('@/common/hooks/use-confirm-quit')

    vi.mocked(useConfirmQuit).mockReturnValue(mockConfirmQuit)

    renderWithProviders(<GeneralTab />)

    const quitButton = screen.getByRole('button', { name: 'Quit ToolHive' })
    await userEvent.click(quitButton)

    expect(mockConfirmQuit).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockElectronAPI.quitApp).toHaveBeenCalled()
    })
  })

  it('does not quit when confirmation is declined', async () => {
    const mockConfirmQuit = vi.fn().mockResolvedValue(false)
    const { useConfirmQuit } = await import('@/common/hooks/use-confirm-quit')

    vi.mocked(useConfirmQuit).mockReturnValue(mockConfirmQuit)

    renderWithProviders(<GeneralTab />)

    const quitButton = screen.getByRole('button', { name: 'Quit ToolHive' })
    await userEvent.click(quitButton)

    expect(mockConfirmQuit).toHaveBeenCalled()
    expect(mockElectronAPI.quitApp).not.toHaveBeenCalled()
  })

  it('disables auto-launch switch when loading', async () => {
    const { useAutoLaunchStatus } = await import(
      '@/common/hooks/use-auto-launch'
    )

    vi.mocked(useAutoLaunchStatus).mockReturnValue({
      data: false,
      isLoading: true,
    })

    renderWithProviders(<GeneralTab />)

    const autoLaunchSwitch = screen.getByRole('switch', {
      name: /start on login/i,
    })
    expect(autoLaunchSwitch).toBeDisabled()
  })

  it('disables telemetry switch when loading', async () => {
    renderWithProviders(<GeneralTab />)

    // Switch should be disabled while query is loading
    await waitFor(() => {
      const telemetrySwitch = screen.getByRole('switch', {
        name: /error reporting/i,
      })
      expect(telemetrySwitch).toBeInTheDocument()
    })
  })
})
