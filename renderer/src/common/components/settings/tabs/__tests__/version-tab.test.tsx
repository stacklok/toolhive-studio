import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VersionTab } from '../version-tab'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockElectronAPI = {
  getAppVersion: vi.fn(),
  isOfficialReleaseBuild: vi.fn(),
  getToolhiveVersion: vi.fn(),
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

describe('VersionTab', () => {
  beforeEach(() => {
    mockElectronAPI.getAppVersion.mockResolvedValue('1.0.0')
    mockElectronAPI.isOfficialReleaseBuild.mockResolvedValue(true)
    mockElectronAPI.getToolhiveVersion.mockResolvedValue('0.9.0')
  })

  it('renders version information heading', async () => {
    renderWithProviders(<VersionTab />)

    await waitFor(() => {
      expect(screen.getByText('Version Information')).toBeVisible()
    })
  })

  it('displays version information when loaded', async () => {
    renderWithProviders(<VersionTab />)

    await waitFor(() => {
      expect(screen.getByText('1.0.0')).toBeVisible()
    })

    expect(screen.getByText('Desktop UI version')).toBeVisible()
    expect(screen.getByText('ToolHive binary version')).toBeVisible()
    expect(screen.getByText('Build type')).toBeVisible()
    expect(screen.getByText('1.0.0')).toBeVisible()
    expect(screen.getByText('0.9.0')).toBeVisible()
    expect(screen.getByText('Release')).toBeVisible()
  })

  it('displays development build type when not a release build', async () => {
    mockElectronAPI.isOfficialReleaseBuild.mockResolvedValue(false)

    renderWithProviders(<VersionTab />)

    await waitFor(() => {
      expect(screen.getByText('Development')).toBeVisible()
    })
  })

  it('handles error when fetching version info', async () => {
    mockElectronAPI.getAppVersion.mockRejectedValue(
      new Error('Failed to fetch')
    )
    mockElectronAPI.isOfficialReleaseBuild.mockRejectedValue(
      new Error('Failed to fetch')
    )
    mockElectronAPI.getToolhiveVersion.mockRejectedValue(
      new Error('Failed to fetch')
    )

    renderWithProviders(<VersionTab />)

    await waitFor(() => {
      expect(screen.getAllByText('N/A')).toHaveLength(2)
    })
  })

  it('calls all version APIs on mount', async () => {
    renderWithProviders(<VersionTab />)

    await waitFor(() => {
      expect(mockElectronAPI.getAppVersion).toHaveBeenCalledTimes(1)
      expect(mockElectronAPI.isOfficialReleaseBuild).toHaveBeenCalledTimes(1)
      expect(mockElectronAPI.getToolhiveVersion).toHaveBeenCalledTimes(1)
    })
  })

  it('displays version badges with correct variants', async () => {
    renderWithProviders(<VersionTab />)

    await waitFor(() => {
      expect(screen.getByText('1.0.0')).toBeVisible()
    })

    const badges = screen.getAllByText((content, element) => {
      return (
        element?.tagName === 'SPAN' &&
        (content === '1.0.0' || content === '0.9.0' || content === 'Release')
      )
    })

    expect(badges).toHaveLength(3)
  })

  it('displays empty toolhive version when not provided', async () => {
    mockElectronAPI.getToolhiveVersion.mockResolvedValue('')

    renderWithProviders(<VersionTab />)

    await waitFor(() => {
      expect(screen.getByText('1.0.0')).toBeVisible()
    })

    expect(screen.getByText('ToolHive binary version')).toBeVisible()
  })
})
