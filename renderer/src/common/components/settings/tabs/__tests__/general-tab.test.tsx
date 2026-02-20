import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GeneralTab } from '../general-tab'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import {
  useAutoLaunchStatus,
  useSetAutoLaunch,
} from '@/common/hooks/use-auto-launch'
import { useTheme } from '@/common/hooks/use-theme'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'

vi.mock('@/common/hooks/use-auto-launch', () => ({
  useAutoLaunchStatus: vi.fn(),
  useSetAutoLaunch: vi.fn(),
}))

vi.mock('@/common/hooks/use-theme', () => ({
  useTheme: vi.fn(),
}))

vi.mock('@/common/hooks/use-feature-flag', () => ({
  useFeatureFlag: vi.fn(),
}))

const mockSentryIsEnabled = vi.fn()
const mockSentryOptIn = vi.fn()
const mockSentryOptOut = vi.fn()
const mockFeatureFlagsGet = vi.fn()
const mockFeatureFlagsGetAll = vi.fn()
const mockFeatureFlagsEnable = vi.fn()
const mockFeatureFlagsDisable = vi.fn()

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

describe('GeneralTab', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()

    window.electronAPI.getSkipQuitConfirmation = vi
      .fn()
      .mockResolvedValue(false)
    window.electronAPI.setSkipQuitConfirmation = vi
      .fn()
      .mockResolvedValue(undefined)

    window.electronAPI.sentry = {
      isEnabled: mockSentryIsEnabled,
      optIn: mockSentryOptIn,
      optOut: mockSentryOptOut,
    } as typeof window.electronAPI.sentry
    window.electronAPI.featureFlags = {
      get: mockFeatureFlagsGet,
      getAll: mockFeatureFlagsGetAll,
      enable: mockFeatureFlagsEnable,
      disable: mockFeatureFlagsDisable,
    } as typeof window.electronAPI.featureFlags

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

    vi.mocked(useFeatureFlag).mockReturnValue(true)

    mockSentryIsEnabled.mockResolvedValue(true)
    mockSentryOptIn.mockResolvedValue(true)
    mockSentryOptOut.mockResolvedValue(false)
    mockFeatureFlagsGet.mockResolvedValue(true)
    mockFeatureFlagsGetAll.mockResolvedValue({})
    mockFeatureFlagsEnable.mockResolvedValue(undefined)
    mockFeatureFlagsDisable.mockResolvedValue(undefined)
  })

  it('renders all settings sections', async () => {
    renderWithProviders(<GeneralTab />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'General' })).toBeVisible()
    })
    expect(screen.getByText('Theme')).toBeVisible()
    expect(screen.getByText('Start on login')).toBeVisible()
    expect(screen.getByText('Error reporting')).toBeVisible()
    expect(screen.getByText('Quit confirmation')).toBeVisible()
  })

  it('handles auto-launch toggle', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useSetAutoLaunch).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSetAutoLaunch>)

    renderWithProviders(<GeneralTab />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'General' })).toBeVisible()
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
      expect(mockSentryOptOut).toHaveBeenCalled()
    })
  })

  it('handles telemetry toggle opt in', async () => {
    mockSentryIsEnabled.mockResolvedValue(false)

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
      expect(mockSentryOptIn).toHaveBeenCalled()
    })
  })

  it('handles quit confirmation toggle', async () => {
    renderWithProviders(<GeneralTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: /quit confirmation/i })
      ).not.toBeChecked()
    })

    const quitConfirmationSwitch = screen.getByRole('switch', {
      name: /quit confirmation/i,
    })

    await userEvent.click(quitConfirmationSwitch)

    expect(window.electronAPI.setSkipQuitConfirmation).toHaveBeenCalledWith(
      true
    )
  })

  it('handles quit confirmation toggle disable skip', async () => {
    window.electronAPI.getSkipQuitConfirmation = vi.fn().mockResolvedValue(true)

    renderWithProviders(<GeneralTab />)

    await waitFor(() => {
      const quitConfirmationSwitch = screen.getByRole('switch', {
        name: /quit confirmation/i,
      })
      expect(quitConfirmationSwitch).toBeChecked()
    })

    const quitConfirmationSwitch = screen.getByRole('switch', {
      name: /quit confirmation/i,
    })
    await userEvent.click(quitConfirmationSwitch)

    expect(window.electronAPI.setSkipQuitConfirmation).toHaveBeenCalledWith(
      false
    )
  })

  describe('Experimental Features', () => {
    it('displays message when no experimental features are available', async () => {
      // Override the mock to return false for experimental_features flag
      vi.mocked(useFeatureFlag).mockReturnValue(false)

      renderWithProviders(<GeneralTab />)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Experimental' })
        ).toBeVisible()
        expect(
          screen.getByText('No experimental features available')
        ).toBeVisible()
      })
    })

    it('displays experimental features when available', async () => {
      mockFeatureFlagsGetAll.mockResolvedValue({
        test_feature: {
          isExperimental: true,
          isDisabled: false,
          defaultValue: false,
          enabled: false,
        },
      })

      renderWithProviders(<GeneralTab />)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Experimental' })
        ).toBeVisible()
        expect(screen.getByText('Test Feature')).toBeVisible()
      })

      expect(screen.getByText('Enable Test Feature feature')).toBeVisible()
    })

    it('does not display non-experimental features', async () => {
      mockFeatureFlagsGetAll.mockResolvedValue({
        regular_feature: {
          isExperimental: false,
          isDisabled: false,
          defaultValue: false,
          enabled: false,
        },
        experimental_feature: {
          isExperimental: true,
          isDisabled: false,
          defaultValue: false,
          enabled: false,
        },
      })

      renderWithProviders(<GeneralTab />)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Experimental' })
        ).toBeVisible()
      })

      expect(screen.queryByText('Regular Feature')).not.toBeInTheDocument()
    })

    it('handles enabling an experimental feature', async () => {
      mockFeatureFlagsGetAll.mockResolvedValue({
        test_feature: {
          isExperimental: true,
          isDisabled: false,
          defaultValue: false,
          enabled: false,
        },
      })

      renderWithProviders(<GeneralTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Feature')).toBeVisible()
      })

      const featureSwitch = screen.getByRole('switch', {
        name: /test feature/i,
      })

      expect(featureSwitch).not.toBeChecked()

      await userEvent.click(featureSwitch)

      await waitFor(() => {
        expect(mockFeatureFlagsEnable).toHaveBeenCalledWith('test_feature')
      })
    })

    it('handles disabling an experimental feature', async () => {
      mockFeatureFlagsGetAll.mockResolvedValue({
        test_feature: {
          isExperimental: true,
          isDisabled: false,
          defaultValue: false,
          enabled: true,
        },
      })

      renderWithProviders(<GeneralTab />)

      await waitFor(() => {
        expect(screen.getByText('Test Feature')).toBeVisible()
      })

      const featureSwitch = screen.getByRole('switch', {
        name: /test feature/i,
      })

      expect(featureSwitch).toBeChecked()

      await userEvent.click(featureSwitch)

      await waitFor(() => {
        expect(mockFeatureFlagsDisable).toHaveBeenCalledWith('test_feature')
      })
    })
  })
})
