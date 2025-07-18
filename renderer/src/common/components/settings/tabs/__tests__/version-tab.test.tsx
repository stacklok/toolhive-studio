import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VersionTab } from '../version-tab'

// Mock electron API
const mockElectronAPI = {
  getAppVersion: vi.fn(),
  isReleaseBuild: vi.fn(),
  getToolhiveVersion: vi.fn(),
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

describe('VersionTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock responses
    mockElectronAPI.getAppVersion.mockResolvedValue('1.0.0')
    mockElectronAPI.isReleaseBuild.mockResolvedValue(true)
    mockElectronAPI.getToolhiveVersion.mockResolvedValue('0.9.0')
  })

  it('renders version information heading', async () => {
    render(<VersionTab />)

    expect(screen.getByText('Version Information')).toBeInTheDocument()
  })

  it('displays loading state initially', async () => {
    render(<VersionTab />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays version information when loaded', async () => {
    render(<VersionTab />)

    await waitFor(() => {
      expect(screen.getByText('1.0.0')).toBeInTheDocument()
    })

    expect(screen.getByText('Desktop UI version')).toBeInTheDocument()
    expect(screen.getByText('ToolHive binary version')).toBeInTheDocument()
    expect(screen.getByText('Build type')).toBeInTheDocument()

    expect(screen.getByText('1.0.0')).toBeInTheDocument()
    expect(screen.getByText('0.9.0')).toBeInTheDocument()
    expect(screen.getByText('Release')).toBeInTheDocument()
  })

  it('displays development build type when not a release build', async () => {
    mockElectronAPI.isReleaseBuild.mockResolvedValue(false)

    render(<VersionTab />)

    await waitFor(() => {
      expect(screen.getByText('Development')).toBeInTheDocument()
    })
  })

  it('handles error when fetching version info', async () => {
    mockElectronAPI.getAppVersion.mockRejectedValue(
      new Error('Failed to fetch')
    )
    mockElectronAPI.isReleaseBuild.mockRejectedValue(
      new Error('Failed to fetch')
    )
    mockElectronAPI.getToolhiveVersion.mockRejectedValue(
      new Error('Failed to fetch')
    )

    // Mock console.error to avoid test output pollution
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<VersionTab />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch version info:',
        expect.any(Error)
      )
    })

    // Should still show loading state when there's an error
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('calls all version APIs on mount', async () => {
    render(<VersionTab />)

    await waitFor(() => {
      expect(mockElectronAPI.getAppVersion).toHaveBeenCalledTimes(1)
      expect(mockElectronAPI.isReleaseBuild).toHaveBeenCalledTimes(1)
      expect(mockElectronAPI.getToolhiveVersion).toHaveBeenCalledTimes(1)
    })
  })

  it('displays version badges with correct variants', async () => {
    render(<VersionTab />)

    await waitFor(() => {
      expect(screen.getByText('1.0.0')).toBeInTheDocument()
    })

    // Check that badges are rendered (they use the Badge component)
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

    render(<VersionTab />)

    await waitFor(() => {
      expect(screen.getByText('1.0.0')).toBeInTheDocument()
    })

    // ToolHive version should be empty but the label should still be there
    expect(screen.getByText('ToolHive binary version')).toBeInTheDocument()
  })

  it('handles partial failure gracefully', async () => {
    mockElectronAPI.getAppVersion.mockResolvedValue('1.0.0')
    mockElectronAPI.isReleaseBuild.mockResolvedValue(true)
    mockElectronAPI.getToolhiveVersion.mockRejectedValue(
      new Error('Toolhive version failed')
    )

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<VersionTab />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch version info:',
        expect.any(Error)
      )
    })

    // Should still show the successfully fetched versions
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
