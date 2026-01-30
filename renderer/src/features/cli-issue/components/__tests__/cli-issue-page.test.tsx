import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import { createTestRouter } from '@/common/test/create-test-router'
import { renderRoute } from '@/common/test/render-route'
import { CliIssuePage } from '../cli-issue-page'

const mockGetValidationResult = vi.fn()
const mockValidate = vi.fn()
const mockRepair = vi.fn()

function renderCliIssuePage() {
  const router = createTestRouter(CliIssuePage, '/cli-issue')
  return renderRoute(router)
}

beforeEach(() => {
  vi.clearAllMocks()

  window.electronAPI.onShowQuitConfirmation = vi.fn(() => vi.fn())
  window.electronAPI.quitApp = vi.fn()

  window.electronAPI.cliAlignment = {
    getStatus: vi.fn(),
    getPathStatus: vi.fn(),
    getValidationResult: mockGetValidationResult,
    validate: mockValidate,
    reinstall: vi.fn(),
    repair: mockRepair,
  } as typeof window.electronAPI.cliAlignment
})

describe('CliIssuePage', () => {
  describe('Loading State', () => {
    it('displays loading state while checking CLI status', async () => {
      // Never resolve to keep loading state
      mockGetValidationResult.mockReturnValue(new Promise(() => {}))

      // Suppress act() warnings from TanStack Router
      vi.spyOn(console, 'error').mockImplementation(() => {})

      await act(async () => {
        renderCliIssuePage()
      })

      await waitFor(() => {
        expect(screen.getByText('Checking CLI status...')).toBeVisible()
      })
    })
  })

  describe('External CLI Found', () => {
    beforeEach(() => {
      mockGetValidationResult.mockResolvedValue({
        status: 'external-cli-found',
        cli: {
          path: '/opt/homebrew/bin/thv',
          version: '0.7.0',
          source: 'homebrew',
        },
      })
    })

    it('displays external CLI warning with Homebrew instructions', async () => {
      renderCliIssuePage()

      await waitFor(() => {
        expect(screen.getByText('External ToolHive CLI Detected')).toBeVisible()
      })

      expect(screen.getByText(/\/opt\/homebrew\/bin\/thv/)).toBeVisible()
      expect(screen.getByText(/version 0\.7\.0/)).toBeVisible()
      expect(screen.getByText('Homebrew')).toBeVisible()
      expect(screen.getByText('brew uninstall thv')).toBeVisible()
      expect(screen.getByRole('button', { name: /check again/i })).toBeVisible()
    })

    it('displays Winget uninstall instructions', async () => {
      mockGetValidationResult.mockResolvedValue({
        status: 'external-cli-found',
        cli: {
          path: 'C:\\Program Files\\toolhive\\thv.exe',
          version: '0.7.0',
          source: 'winget',
        },
      })

      renderCliIssuePage()

      await waitFor(() => {
        expect(screen.getByText('External ToolHive CLI Detected')).toBeVisible()
      })

      expect(screen.getByText('Winget')).toBeVisible()
      expect(screen.getByText('winget uninstall thv')).toBeVisible()
    })

    it('displays manual uninstall message for manual installations', async () => {
      mockGetValidationResult.mockResolvedValue({
        status: 'external-cli-found',
        cli: {
          path: '/usr/local/bin/thv',
          version: null,
          source: 'manual',
        },
      })

      renderCliIssuePage()

      await waitFor(() => {
        expect(screen.getByText('External ToolHive CLI Detected')).toBeVisible()
      })

      expect(screen.getByText('Manual installation')).toBeVisible()
      expect(
        screen.getByText(
          'Please manually remove the external ToolHive CLI installation.'
        )
      ).toBeVisible()
    })

    it('calls validate when Check Again is clicked', async () => {
      mockValidate.mockResolvedValue({
        status: 'external-cli-found',
        cli: {
          path: '/opt/homebrew/bin/thv',
          version: '0.7.0',
          source: 'homebrew',
        },
      })

      renderCliIssuePage()

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /check again/i })
        ).toBeVisible()
      })

      const checkAgainButton = screen.getByRole('button', {
        name: /check again/i,
      })
      await userEvent.click(checkAgainButton)

      expect(mockValidate).toHaveBeenCalled()
    })
  })

  describe('Symlink Broken', () => {
    beforeEach(() => {
      mockGetValidationResult.mockResolvedValue({
        status: 'symlink-broken',
        target: '/old/path/to/thv',
      })
    })

    it('displays symlink broken message with repair option', async () => {
      renderCliIssuePage()

      await waitFor(() => {
        expect(screen.getByText('CLI Installation Needs Repair')).toBeVisible()
      })

      expect(
        screen.getByText('The ToolHive CLI symlink is broken.')
      ).toBeVisible()
      expect(screen.getByText('Was pointing to:')).toBeVisible()
      expect(screen.getByText('/old/path/to/thv')).toBeVisible()
      expect(screen.getByRole('button', { name: /repair/i })).toBeVisible()
    })

    it('calls repair when Repair button is clicked', async () => {
      mockRepair.mockResolvedValue({
        repairResult: { success: true },
        validationResult: {
          status: 'symlink-broken',
          target: '/old/path/to/thv',
        },
      })

      renderCliIssuePage()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /repair/i })).toBeVisible()
      })

      const repairButton = screen.getByRole('button', { name: /repair/i })
      await userEvent.click(repairButton)

      expect(mockRepair).toHaveBeenCalled()
    })

    it('displays error when repair fails', async () => {
      mockRepair.mockResolvedValue({
        repairResult: { success: false, error: 'Permission denied' },
        validationResult: null,
      })

      renderCliIssuePage()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /repair/i })).toBeVisible()
      })

      const repairButton = screen.getByRole('button', { name: /repair/i })
      await userEvent.click(repairButton)

      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeVisible()
      })
    })
  })

  describe('Symlink Tampered', () => {
    beforeEach(() => {
      mockGetValidationResult.mockResolvedValue({
        status: 'symlink-tampered',
        target: '/wrong/path/to/thv',
      })
    })

    it('displays symlink tampered message with restore option', async () => {
      renderCliIssuePage()

      await waitFor(() => {
        expect(screen.getByText('CLI Installation Modified')).toBeVisible()
      })

      expect(
        screen.getByText('The ToolHive CLI has been modified externally.')
      ).toBeVisible()
      expect(screen.getByText('Currently pointing to:')).toBeVisible()
      expect(screen.getByText('/wrong/path/to/thv')).toBeVisible()
      expect(screen.getByRole('button', { name: /restore/i })).toBeVisible()
    })

    it('calls repair when Restore button is clicked', async () => {
      mockRepair.mockResolvedValue({
        repairResult: { success: true },
        validationResult: { status: 'valid' },
      })

      renderCliIssuePage()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /restore/i })).toBeVisible()
      })

      const restoreButton = screen.getByRole('button', { name: /restore/i })
      await userEvent.click(restoreButton)

      expect(mockRepair).toHaveBeenCalled()
    })
  })

  describe('Version Display', () => {
    it('displays version info when available', async () => {
      mockGetValidationResult.mockResolvedValue({
        status: 'external-cli-found',
        cli: {
          path: '/opt/homebrew/bin/thv',
          version: '1.2.3',
          source: 'homebrew',
        },
      })

      renderCliIssuePage()

      await waitFor(() => {
        expect(screen.getByText(/version 1\.2\.3/)).toBeVisible()
      })
    })

    it('does not display version when not available', async () => {
      mockGetValidationResult.mockResolvedValue({
        status: 'external-cli-found',
        cli: {
          path: '/opt/homebrew/bin/thv',
          version: null,
          source: 'homebrew',
        },
      })

      renderCliIssuePage()

      await waitFor(() => {
        expect(screen.getByText(/\/opt\/homebrew\/bin\/thv/)).toBeVisible()
      })

      // Check that "version X.Y.Z" pattern is not present (the word "version" appears in other text)
      expect(
        screen.queryByText(/version \d+\.\d+\.\d+/)
      ).not.toBeInTheDocument()
    })
  })
})
