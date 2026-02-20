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

    window.electronAPI.platform = 'darwin'
    window.electronAPI.getMainLogContent = mockGetMainLogContent

    mockGetMainLogContent.mockResolvedValue('/logs/main.log')
    navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined)

    document.querySelectorAll('a').forEach((link) => link.remove())
  })

  it('renders logs tab heading and description', async () => {
    render(<LogsTab />)

    await waitFor(() => {
      expect(screen.getByText('Logs')).toBeVisible()
    })

    expect(
      screen.getByText(/Application logs are stored locally/)
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save log file' })).toBeVisible()
  })

  it('displays correct log path for macOS', async () => {
    window.electronAPI.platform = 'darwin'

    render(<LogsTab />)

    await waitFor(() => {
      expect(screen.getByText('~/Library/Logs/ToolHive/main.log')).toBeVisible()
    })
  })

  it('displays correct log path for Windows', async () => {
    window.electronAPI.platform = 'win32'

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
    window.electronAPI.platform = 'linux'

    render(<LogsTab />)

    await waitFor(() => {
      expect(screen.getByText('~/.config/ToolHive/logs/main.log')).toBeVisible()
    })
  })

  it('copies log path to clipboard when copy button is clicked', async () => {
    render(<LogsTab />)

    const copyButton = screen.getByRole('button', { name: 'Copy command' })
    await userEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '~/Library/Logs/ToolHive/main.log'
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
