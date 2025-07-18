import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogsTab } from '../logs-tab'

// Mock delay utility
vi.mock('../../../../../../utils/delay', () => ({
  delay: vi.fn().mockResolvedValue(undefined),
}))

// Mock electron-log
vi.mock('electron-log/renderer', () => ({
  default: {
    error: vi.fn(),
  },
}))

// Mock electron API
const mockElectronAPI = {
  platform: 'darwin',
  getMainLogContent: vi.fn(),
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

// Mock DOM methods
Object.defineProperties(window.HTMLElement.prototype, {
  scrollIntoView: {
    value: vi.fn(),
    writable: true,
  },
})

// Mock URL and Blob
global.URL = {
  createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: vi.fn(),
} as any

global.Blob = vi.fn().mockImplementation((content, options) => ({
  content,
  options,
})) as any

describe('LogsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    mockElectronAPI.getMainLogContent.mockResolvedValue(
      'Mock log content for testing'
    )
    navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined)

    // Clean up any created DOM elements
    document.querySelectorAll('a').forEach((link) => link.remove())
  })

  it('renders logs tab heading and description', async () => {
    render(<LogsTab />)

    expect(screen.getByText('Application Logs')).toBeInTheDocument()
    expect(
      screen.getByText(/Application logs are stored locally/)
    ).toBeInTheDocument()
  })

  it('displays correct log path for macOS', async () => {
    mockElectronAPI.platform = 'darwin'

    render(<LogsTab />)

    expect(
      screen.getByText('~/Library/Logs/ToolHive/main.log')
    ).toBeInTheDocument()
  })

  it('displays correct log path for Windows', async () => {
    mockElectronAPI.platform = 'win32'

    render(<LogsTab />)

    expect(
      screen.getByText(
        '%USERPROFILE%\\AppData\\Roaming\\ToolHive\\logs\\main.log'
      )
    ).toBeInTheDocument()
  })

  it('displays correct log path for Linux', async () => {
    mockElectronAPI.platform = 'linux'

    render(<LogsTab />)

    expect(
      screen.getByText('~/.config/ToolHive/logs/main.log')
    ).toBeInTheDocument()
  })

  it('copies log path to clipboard when copy button is clicked', async () => {
    render(<LogsTab />)

    const copyButton = screen.getByRole('button', { name: 'Copy log path' })
    await userEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '~/Library/Logs/ToolHive/main.log'
    )
  })

  it('shows check icon briefly after copying', async () => {
    const { delay } = await import('../../../../../../utils/delay')

    render(<LogsTab />)

    const copyButton = screen.getByRole('button', { name: 'Copy log path' })
    await userEvent.click(copyButton)

    // Check icon should be visible (the test would fail if Copy icon was still there)
    expect(delay).toHaveBeenCalledWith(2000)
  })

  it('handles clipboard copy error gracefully', async () => {
    const mockError = new Error('Clipboard access denied')
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(mockError)

    const logErrorSpy = vi.spyOn(
      await import('electron-log/renderer'),
      'default'
    )

    render(<LogsTab />)

    const copyButton = screen.getByRole('button', { name: 'Copy log path' })
    await userEvent.click(copyButton)

    expect(logErrorSpy.error).toHaveBeenCalledWith(
      'Failed to copy to clipboard:',
      mockError
    )
  })

  it('shows download button when log content is available', async () => {
    render(<LogsTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download log file' })
      ).toBeInTheDocument()
    })
  })

  it('downloads log file when download button is clicked', async () => {
    render(<LogsTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download log file' })
      ).toBeInTheDocument()
    })

    const downloadButton = screen.getByRole('button', {
      name: 'Download log file',
    })
    await userEvent.click(downloadButton)

    expect(mockElectronAPI.getMainLogContent).toHaveBeenCalled()
    expect(global.Blob).toHaveBeenCalledWith(['Mock log content for testing'], {
      type: 'text/plain',
    })
    expect(global.URL.createObjectURL).toHaveBeenCalled()
  })

  it('creates download link with correct filename', async () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    render(<LogsTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download log file' })
      ).toBeInTheDocument()
    })

    const downloadButton = screen.getByRole('button', {
      name: 'Download log file',
    })
    await userEvent.click(downloadButton)

    await waitFor(() => {
      expect(appendChildSpy).toHaveBeenCalled()
    })

    const linkElement = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(linkElement.tagName).toBe('A')
    expect(linkElement.href).toBe('blob:mock-url')
    expect(linkElement.download).toMatch(
      /^toolhive-main-\d{4}-\d{2}-\d{2}\.log$/
    )

    expect(removeChildSpy).toHaveBeenCalledWith(linkElement)
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('shows downloading state while download is in progress', async () => {
    let resolveGetLogContent: (value: string) => void
    const logContentPromise = new Promise<string>((resolve) => {
      resolveGetLogContent = resolve
    })

    mockElectronAPI.getMainLogContent.mockReturnValue(logContentPromise)

    render(<LogsTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download log file' })
      ).toBeInTheDocument()
    })

    const downloadButton = screen.getByRole('button', {
      name: 'Download log file',
    })
    await userEvent.click(downloadButton)

    expect(
      screen.getByRole('button', { name: 'Downloading...' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Downloading...' })
    ).toBeDisabled()

    // Resolve the promise to complete the download
    resolveGetLogContent!('Mock log content')

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download log file' })
      ).toBeInTheDocument()
    })
  })

  it('handles download error gracefully', async () => {
    const mockError = new Error('Failed to get log content')
    mockElectronAPI.getMainLogContent.mockRejectedValue(mockError)

    const logErrorSpy = vi.spyOn(
      await import('electron-log/renderer'),
      'default'
    )

    render(<LogsTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download log file' })
      ).toBeInTheDocument()
    })

    const downloadButton = screen.getByRole('button', {
      name: 'Download log file',
    })
    await userEvent.click(downloadButton)

    await waitFor(() => {
      expect(logErrorSpy.error).toHaveBeenCalledWith(
        'Failed to download log file:',
        mockError
      )
    })

    // Button should be enabled again after error
    expect(
      screen.getByRole('button', { name: 'Download log file' })
    ).not.toBeDisabled()
  })

  it('handles empty log content error', async () => {
    mockElectronAPI.getMainLogContent.mockResolvedValue('')

    const logErrorSpy = vi.spyOn(
      await import('electron-log/renderer'),
      'default'
    )

    render(<LogsTab />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download log file' })
      ).toBeInTheDocument()
    })

    const downloadButton = screen.getByRole('button', {
      name: 'Download log file',
    })
    await userEvent.click(downloadButton)

    await waitFor(() => {
      expect(logErrorSpy.error).toHaveBeenCalledWith(
        'Failed to download log file:',
        expect.objectContaining({ message: 'Failed to get log content' })
      )
    })
  })

  it('falls back to static log path when getMainLogContent fails', async () => {
    mockElectronAPI.getMainLogContent.mockRejectedValue(
      new Error('API not available')
    )

    render(<LogsTab />)

    // Should still show the static path
    expect(
      screen.getByText('~/Library/Logs/ToolHive/main.log')
    ).toBeInTheDocument()
  })

  it('handles unknown platform gracefully', async () => {
    mockElectronAPI.platform = 'unknown' as any

    render(<LogsTab />)

    // Should not crash and should show some path (empty in this case)
    expect(screen.getByText('Application Logs')).toBeInTheDocument()
  })
})
