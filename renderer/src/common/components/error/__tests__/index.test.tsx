import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Error as ErrorComponent } from '../index'

const mockElectronAPI = {
  isLinux: false,
  isMac: false,
  isWindows: false,
  platform: 'win32',
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

describe('Error', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders <KeyringError /> when error contains "OS keyring is not available" and platform is Linux', () => {
    const keyringError = new Error('OS keyring is not available')

    mockElectronAPI.isLinux = true
    mockElectronAPI.platform = 'linux'

    render(<ErrorComponent error={keyringError} />)

    expect(screen.getByText('System Keyring Cannot be Reached')).toBeVisible()
    expect(
      screen.getByText(/ToolHive Studio needs to access your system keyring/)
    ).toBeVisible()
  })

  it('renders generic error when keyring error occurs on non-Linux platform', () => {
    const keyringError = new Error('OS keyring is not available')

    mockElectronAPI.isLinux = false
    mockElectronAPI.platform = 'win32'

    render(<ErrorComponent error={keyringError} />)

    expect(screen.getByText('Oops, something went wrong')).toBeVisible()
    expect(screen.getByText('OS keyring is not available')).toBeVisible()

    // Verify that the CUSTOM keyring error is NOT shown
    expect(
      screen.queryByText('System Keyring Cannot be Reached')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/ToolHive Studio needs to access your system keyring/)
    ).not.toBeInTheDocument()
  })

  it('renders generic error properly', () => {
    const genericError = new Error('Network connection failed')

    render(<ErrorComponent error={genericError} />)

    expect(screen.getByText('Oops, something went wrong')).toBeVisible()
    expect(screen.getByText('Network connection failed')).toBeVisible()
  })
})
