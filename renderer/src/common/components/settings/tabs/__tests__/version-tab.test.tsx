import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VersionTab } from '../version-tab'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AppVersionInfo } from '@/common/hooks/use-app-version'

const mockElectronAPI = {
  isAutoUpdateEnabled: vi.fn(),
  setAutoUpdate: vi.fn(),
  manualUpdate: vi.fn(),
  getUpdateState: vi.fn(),
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
  beforeEach(() => {
    mockElectronAPI.isAutoUpdateEnabled.mockResolvedValue(true)
    mockElectronAPI.getUpdateState.mockResolvedValue('none')
  })

  it('renders version information heading', () => {
    renderWithProviders(
      <VersionTab appInfo={mockAppInfo} isLoading={false} error={null} />
    )

    expect(screen.getByText('Version Information')).toBeVisible()
  })

  it('displays version information when loaded', () => {
    renderWithProviders(
      <VersionTab appInfo={mockAppInfo} isLoading={false} error={null} />
    )

    expect(screen.getByText('Desktop UI version')).toBeVisible()
    expect(screen.getByText('ToolHive binary version')).toBeVisible()
    expect(screen.getByText('Build type')).toBeVisible()
    expect(screen.getByText('1.0.0')).toBeVisible()
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
        (content === '1.0.0' || content === '0.9.0' || content === 'Release')
      )
    })

    expect(badges).toHaveLength(3)
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
})
