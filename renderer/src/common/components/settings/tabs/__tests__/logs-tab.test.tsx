import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LogsTab } from '../logs-tab'
import { toast } from 'sonner'

const mockGetMainLogContent = vi.fn()

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

// Blob mock must stay local - MSW uses Blob internally
global.Blob = vi.fn(function Blob(content, options) {
  return {
    content,
    options,
  }
}) as unknown as typeof Blob

describe('LogsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Preload exposes `mainLogPath` synchronously via `ipcRenderer.sendSync`
    // at bootstrap time. In tests, the global `resetElectronAPI` runs first
    // and re-creates `window.electronAPI`, so this assignment must live here.
    window.electronAPI.mainLogPath =
      '/Users/test/Library/Logs/ToolHive/main.log'
    window.electronAPI.platform = 'darwin'
    window.electronAPI.getMainLogContent = mockGetMainLogContent

    mockGetMainLogContent.mockResolvedValue('/logs/main.log')
    navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined)

    document.querySelectorAll('a').forEach((link) => link.remove())
  })

  it('renders logs tab heading and description', () => {
    render(<LogsTab />)

    expect(screen.getByText('Logs')).toBeVisible()
    expect(
      screen.getByText(/Application logs are stored locally/)
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save log file' })).toBeVisible()
  })

  it('displays the log path exposed by preload', () => {
    render(<LogsTab />)

    expect(
      screen.getByText('/Users/test/Library/Logs/ToolHive/main.log')
    ).toBeVisible()
  })

  it('copies log path to clipboard when copy button is clicked', async () => {
    render(<LogsTab />)

    const copyButton = screen.getByRole('button', { name: 'Copy command' })
    await userEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '/Users/test/Library/Logs/ToolHive/main.log'
      )
    })
  })

  it('downloads log file when download button is clicked', async () => {
    render(<LogsTab />)

    const downloadButton = screen.getByRole('button', {
      name: 'Save log file',
    })
    await userEvent.click(downloadButton)

    expect(mockGetMainLogContent).toHaveBeenCalled()
    expect(global.Blob).toHaveBeenCalledWith(['/logs/main.log'], {
      type: 'text/plain',
    })
    expect(global.URL.createObjectURL).toHaveBeenCalled()
  })

  it('handles download error gracefully', async () => {
    const mockError = new Error('Failed to get log content')
    mockGetMainLogContent.mockRejectedValue(mockError)

    render(<LogsTab />)

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
