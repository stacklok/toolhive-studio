import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GeneralTab } from '../general-tab'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import {
  useAutoLaunchStatus,
  useSetAutoLaunch,
} from '@/common/hooks/use-auto-launch'
import { useTheme } from '@/common/hooks/use-theme'

vi.mock('@/common/hooks/use-auto-launch', () => ({
  useAutoLaunchStatus: vi.fn(),
  useSetAutoLaunch: vi.fn(),
}))

vi.mock('@/common/hooks/use-theme', () => ({
  useTheme: vi.fn(),
}))

const mockElectronAPI = {
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
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()

    vi.mocked(useAutoLaunchStatus).mockReturnValue({
      data: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useAutoLaunchStatus>)

    vi.mocked(useSetAutoLaunch).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSetAutoLaunch>)

    vi.mocked(useTheme).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useTheme>)

    mockElectronAPI.sentry.isEnabled.mockResolvedValue(true)
    mockElectronAPI.sentry.optIn.mockResolvedValue(true)
    mockElectronAPI.sentry.optOut.mockResolvedValue(false)
  })

  it('renders all settings sections', async () => {
    renderWithProviders(<GeneralTab />)

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeVisible()
    })
    expect(screen.getByText('Theme')).toBeVisible()
    expect(screen.getByText('Start on login')).toBeVisible()
    expect(screen.getByText('Error reporting')).toBeVisible()
    expect(screen.getByText('Skip quit confirmation')).toBeVisible()
  })

  it('handles auto-launch toggle', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useSetAutoLaunch).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSetAutoLaunch>)

    renderWithProviders(<GeneralTab />)
    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeVisible()
    })

    const autoLaunchSwitch = screen.getByRole('switch', {
      name: /start on login/i,
    })
    await userEvent.click(autoLaunchSwitch)

    expect(mockMutateAsync).toHaveBeenCalledWith(true)
  })

  it('handles telemetry toggle opt out', async () => {
    renderWithProviders(<GeneralTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: /error reporting/i })
      ).toBeVisible()
    })

    const telemetrySwitch = screen.getByRole('switch', {
      name: /error reporting/i,
    })
    await userEvent.click(telemetrySwitch)

    await waitFor(() => {
      expect(mockElectronAPI.sentry.optOut).toHaveBeenCalled()
    })
  })

  it('handles telemetry toggle opt in', async () => {
    mockElectronAPI.sentry.isEnabled.mockResolvedValue(false)

    renderWithProviders(<GeneralTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: /error reporting/i })
      ).toBeVisible()
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

    expect(quitConfirmationSwitch).not.toBeChecked()

    await userEvent.click(quitConfirmationSwitch)

    expect(quitConfirmationSwitch).toBeChecked()
    expect(localStorage.getItem('doNotShowAgain_confirm_quit')).toBe('true')
  })

  it('handles quit confirmation toggle disable skip', async () => {
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
})
