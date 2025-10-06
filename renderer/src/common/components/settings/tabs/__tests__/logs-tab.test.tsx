import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogsTab } from '../logs-tab'
import { toast } from 'sonner'

const mockElectronAPI = {
  platform: 'darwin',
  getMainLogContent: vi.fn(),
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

// Mock URL methods while keeping the native URL constructor
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

global.Blob = vi.fn().mockImplementation((content, options) => ({
  content,
  options,
})) as unknown as typeof Blob

vi.mock('sonner', async () => {
  const original = await vi.importActual<typeof import('sonner')>('sonner')
  return {
    ...original,
    toast: {
      loading: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      dismiss: vi.fn(),
    },
  }
})

describe('LogsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockElectronAPI.getMainLogContent.mockResolvedValue('/logs/main.log')
    navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined)

    document.querySelectorAll('a').forEach((link) => link.remove())
  })

  it('renders logs tab heading and description', async () => {
    render(<LogsTab />)

    await waitFor(() => {
      expect(screen.getByText('Application Logs')).toBeVisible()
    })

    expect(
      screen.getByText(/Application logs are stored locally/)
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save log file' })).toBeVisible()
  })

  it('displays correct log path for macOS', async () => {
    mockElectronAPI.platform = 'darwin'

    render(<LogsTab />)

    await waitFor(() => {
      expect(screen.getByText('~/Library/Logs/ToolHive/main.log')).toBeVisible()
    })
  })

  it('displays correct log path for Windows', async () => {
    mockElectronAPI.platform = 'win32'

    render(<LogsTab />)

    await waitFor(() => {
      expect(
        screen.getByText(
          '%USERPROFILE%\\AppData\\Roaming\\ToolHive\\logs\\main.log'
        )
      ).toBeVisible()
    })
  })

  it('displays correct log path for Linux', async () => {
    mockElectronAPI.platform = 'linux'

    render(<LogsTab />)

    await waitFor(() => {
      expect(screen.getByText('~/.config/ToolHive/logs/main.log')).toBeVisible()
    })
  })

  it('copies log path to clipboard when copy button is clicked', async () => {
    render(<LogsTab />)

    const copyButton = screen.getByRole('button', { name: 'Copy log path' })
    await userEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '/logs/main.log'
      )
    })
  })

  it('downloads log file when download button is clicked', async () => {
    render(<LogsTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Save log file' })
      ).toBeVisible()
    })

    const downloadButton = screen.getByRole('button', {
      name: 'Save log file',
    })
    await userEvent.click(downloadButton)

    expect(mockElectronAPI.getMainLogContent).toHaveBeenCalled()
    expect(global.Blob).toHaveBeenCalledWith(['/logs/main.log'], {
      type: 'text/plain',
    })
    expect(global.URL.createObjectURL).toHaveBeenCalled()
  })

  it('handles download error gracefully', async () => {
    const mockError = new Error('Failed to get log content')
    mockElectronAPI.getMainLogContent.mockRejectedValue(mockError)

    render(<LogsTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Save log file' })
      ).toBeVisible()
    })

    const downloadButton = screen.getByRole('button', {
      name: 'Save log file',
    })
    await userEvent.click(downloadButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save file')
    })

    expect(
      screen.getByRole('button', { name: 'Save log file' })
    ).not.toBeDisabled()
  })
})
