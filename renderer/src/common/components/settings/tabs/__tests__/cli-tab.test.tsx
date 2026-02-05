import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CliTab } from '../cli-tab'

const mockGetStatus = vi.fn()
const mockGetPathStatus = vi.fn()
const mockGetValidationResult = vi.fn()
const mockValidate = vi.fn()
const mockReinstall = vi.fn()

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

const defaultCliStatus = {
  isManaged: true,
  cliPath: '/home/testuser/.toolhive/bin/thv',
  cliVersion: '0.7.2',
  installMethod: 'symlink' as const,
  symlinkTarget: '/app/resources/thv',
  isValid: true,
  lastValidated: '2024-01-01T00:00:00.000Z',
}

const defaultPathStatus = {
  isConfigured: true,
  modifiedFiles: ['/home/testuser/.zshrc'],
  pathEntry: 'export PATH="$HOME/.toolhive/bin:$PATH"',
}

describe('CliTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    window.electronAPI.cliAlignment = {
      getStatus: mockGetStatus,
      getPathStatus: mockGetPathStatus,
      getValidationResult: mockGetValidationResult,
      validate: mockValidate,
      reinstall: mockReinstall,
      repair: vi.fn(),
    } as typeof window.electronAPI.cliAlignment

    mockGetStatus.mockResolvedValue(defaultCliStatus)
    mockGetPathStatus.mockResolvedValue(defaultPathStatus)
    mockGetValidationResult.mockResolvedValue({ status: 'valid' })
    mockValidate.mockResolvedValue({ status: 'valid' })
    mockReinstall.mockResolvedValue({ success: true })
  })

  describe('Loading and Error States', () => {
    it('displays loading state', () => {
      mockGetStatus.mockReturnValue(new Promise(() => {})) // Never resolves

      renderWithProviders(<CliTab />)

      expect(screen.getByText('Loading CLI information...')).toBeVisible()
    })

    it('displays error state when status fetch fails', async () => {
      mockGetStatus.mockRejectedValue(new Error('Failed to fetch'))

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load CLI information')).toBeVisible()
      })
    })
  })

  describe('CLI Status Display', () => {
    it('renders CLI installation section with status', async () => {
      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeVisible()
      })

      expect(screen.getByText('CLI Installation')).toBeVisible()
      // Multiple "Valid" badges exist (CLI status + PATH status)
      expect(screen.getAllByText('Valid').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('CLI Version')).toBeVisible()
      expect(screen.getByText('0.7.2')).toBeVisible()
      expect(screen.getByText('Install Method')).toBeVisible()
      expect(screen.getByText('Symlink')).toBeVisible()
      expect(screen.getByText('Managed by')).toBeVisible()
      expect(screen.getByText('ToolHive UI')).toBeVisible()
    })

    it('displays CLI location with symlink target', async () => {
      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByText('CLI Location')).toBeVisible()
      })

      expect(screen.getByText('/home/testuser/.toolhive/bin/thv')).toBeVisible()
      expect(screen.getByText('Points to:')).toBeVisible()
      expect(screen.getByText('/app/resources/thv')).toBeVisible()
    })

    it('displays invalid status badge when CLI is not valid', async () => {
      mockGetStatus.mockResolvedValue({
        ...defaultCliStatus,
        isValid: false,
      })

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByText('Invalid')).toBeVisible()
      })
    })

    it('shows "Not installed" when install method is null', async () => {
      mockGetStatus.mockResolvedValue({
        ...defaultCliStatus,
        installMethod: null,
        isManaged: false,
      })

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByText('Not installed')).toBeVisible()
      })
    })

    it('shows "Copy" for copy install method', async () => {
      mockGetStatus.mockResolvedValue({
        ...defaultCliStatus,
        installMethod: 'copy',
      })

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeVisible()
      })
    })

    it('displays alert when CLI is not managed', async () => {
      mockGetStatus.mockResolvedValue({
        ...defaultCliStatus,
        isManaged: false,
      })

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(
          screen.getByText(/CLI is not currently managed by ToolHive UI/)
        ).toBeVisible()
      })
    })
  })

  describe('PATH Configuration Display', () => {
    it('displays PATH configuration section', async () => {
      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByText('PATH Configuration')).toBeVisible()
      })

      expect(screen.getByText('Shell PATH')).toBeVisible()
      expect(
        screen.getByText('CLI is accessible from your terminal')
      ).toBeVisible()
    })

    it('displays modified files list', async () => {
      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByText('Modified files:')).toBeVisible()
      })

      expect(screen.getByText('/home/testuser/.zshrc')).toBeVisible()
    })

    it('shows warning when PATH is not configured', async () => {
      mockGetPathStatus.mockResolvedValue({
        ...defaultPathStatus,
        isConfigured: false,
        modifiedFiles: [],
      })

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(
          screen.getByText(
            'PATH not configured - run `thv` may not work in new terminals'
          )
        ).toBeVisible()
      })
    })
  })

  describe('External CLI Detection', () => {
    it('displays alert when external CLI is detected via Homebrew', async () => {
      mockGetValidationResult.mockResolvedValue({
        status: 'external-cli-found',
        cli: {
          path: '/opt/homebrew/bin/thv',
          version: '0.7.0',
          source: 'homebrew',
        },
      })

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(
          screen.getByText('External CLI Installation Detected')
        ).toBeVisible()
      })

      expect(screen.getByText('/opt/homebrew/bin/thv')).toBeVisible()
      expect(screen.getByText('brew uninstall thv')).toBeVisible()
    })

    it('displays alert when external CLI is detected via Winget', async () => {
      mockGetValidationResult.mockResolvedValue({
        status: 'external-cli-found',
        cli: {
          path: 'C:\\Program Files\\toolhive\\thv.exe',
          version: '0.7.0',
          source: 'winget',
        },
      })

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(
          screen.getByText('External CLI Installation Detected')
        ).toBeVisible()
      })

      expect(screen.getByText('winget uninstall thv')).toBeVisible()
    })

    it('displays alert when external CLI is detected via manual install', async () => {
      mockGetValidationResult.mockResolvedValue({
        status: 'external-cli-found',
        cli: {
          path: '/usr/local/bin/thv',
          version: '0.7.0',
          source: 'manual',
        },
      })

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(
          screen.getByText('External CLI Installation Detected')
        ).toBeVisible()
      })

      expect(
        screen.getByText(
          'Please manually remove the external CLI installation.'
        )
      ).toBeVisible()
    })

    it('does not display external CLI alert when status is valid', async () => {
      mockGetValidationResult.mockResolvedValue({ status: 'valid' })

      renderWithProviders(<CliTab />)

      // Wait for content to load (Status only appears after loading)
      await waitFor(() => {
        expect(screen.getByText('Status')).toBeVisible()
      })

      expect(
        screen.queryByText('External CLI Installation Detected')
      ).not.toBeInTheDocument()
    })
  })

  describe('Header Actions', () => {
    it('renders docs link with correct URL', async () => {
      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByText('Docs')).toBeVisible()
      })

      const docsLink = screen.getByRole('link', { name: /docs/i })
      expect(docsLink).toHaveAttribute(
        'href',
        'https://docs.stacklok.com/toolhive/guides-cli/'
      )
      expect(docsLink).toHaveAttribute('target', '_blank')
    })

    it('renders refresh button', async () => {
      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /refresh status/i })
        ).toBeVisible()
      })
    })

    it('renders reinstall button', async () => {
      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reinstall/i })).toBeVisible()
      })
    })
  })

  describe('User Interactions', () => {
    it('calls validate when refresh button is clicked', async () => {
      const user = userEvent.setup()

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /refresh status/i })
        ).toBeVisible()
      })

      const refreshButton = screen.getByRole('button', {
        name: /refresh status/i,
      })
      await user.click(refreshButton)

      expect(mockValidate).toHaveBeenCalled()
    })

    it('calls reinstall when reinstall button is clicked', async () => {
      const user = userEvent.setup()

      renderWithProviders(<CliTab />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reinstall/i })).toBeVisible()
      })

      const reinstallButton = screen.getByRole('button', { name: /reinstall/i })
      await user.click(reinstallButton)

      await waitFor(() => {
        expect(mockReinstall).toHaveBeenCalled()
      })
    })

    it('detects external CLI on refresh and shows warning', async () => {
      const user = userEvent.setup()

      // Initially no external CLI
      mockGetValidationResult.mockResolvedValue({ status: 'valid' })

      // After validation, external CLI is found
      mockValidate.mockResolvedValue({
        status: 'external-cli-found',
        cli: {
          path: '/home/linuxbrew/.linuxbrew/bin/thv',
          version: '0.7.0',
          source: 'homebrew',
        },
      })

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <CliTab />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /refresh status/i })
        ).toBeVisible()
      })

      // Initially no warning
      expect(
        screen.queryByText('External CLI Installation Detected')
      ).not.toBeInTheDocument()

      // Click refresh
      const refreshButton = screen.getByRole('button', {
        name: /refresh status/i,
      })
      await user.click(refreshButton)

      expect(mockValidate).toHaveBeenCalled()
    })
  })
})
