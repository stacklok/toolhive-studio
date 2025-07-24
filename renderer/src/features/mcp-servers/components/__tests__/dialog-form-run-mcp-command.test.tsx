import { render, waitFor, screen, act } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import { DialogFormRunMcpServerWithCommand } from '../dialog-form-run-mcp-command'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/common/components/ui/dialog'
import { server as mswServer } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRunCustomServer } from '../../hooks/use-run-custom-server'

// Mock the hook
vi.mock('../../hooks/use-run-custom-server', () => ({
  useRunCustomServer: vi.fn(),
}))

const mockUseRunCustomServer = vi.mocked(useRunCustomServer)

window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 0,
      staleTime: 0,
    },
  },
})

beforeEach(() => {
  vi.clearAllMocks()

  // Setup MSW with default secrets
  mswServer.use(
    http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
      return HttpResponse.json({
        keys: [
          { key: 'SECRET_FROM_STORE' },
          { key: 'GITHUB_TOKEN' },
          { key: 'API_KEY' },
        ],
      })
    }),
    // Mock empty workloads by default
    http.get(mswEndpoint('/api/v1beta/workloads'), () => {
      return HttpResponse.json({ workloads: [] })
    })
  )

  // Default mock implementation
  mockUseRunCustomServer.mockReturnValue({
    installServerMutation: vi.fn(),
    checkServerStatus: vi.fn(),
    isErrorSecrets: false,
    isPendingSecrets: false,
  })
})

describe('DialogFormRunMcpServerWithCommand', () => {
  it('renders form fields correctly for docker image', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open>
          <DialogFormRunMcpServerWithCommand isOpen onOpenChange={vi.fn()} />
        </Dialog>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Check dialog title and description
    expect(screen.getByText('Custom MCP server')).toBeVisible()
    expect(
      screen.getByText(
        /ToolHive allows you to securely run a custom MCP server/
      )
    ).toBeVisible()

    // Check form fields
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Transport')).toBeInTheDocument()
    expect(screen.getByLabelText('Docker image')).toBeInTheDocument()
    expect(screen.getByLabelText('Command arguments')).toBeInTheDocument()

    // Check buttons
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Install server' })
    ).toBeInTheDocument()
  })

  it('submits docker image form with minimal required fields', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open>
          <DialogFormRunMcpServerWithCommand isOpen onOpenChange={vi.fn()} />
        </Dialog>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await userEvent.type(screen.getByLabelText('Name'), 'test-server')
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByLabelText('Docker image'),
      'ghcr.io/test/server'
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            name: 'test-server',
            transport: 'stdio',
            image: 'ghcr.io/test/server',
            type: 'docker_image',
            envVars: [],
            secrets: [],
            cmd_arguments: undefined,
          }),
        },
        expect.any(Object)
      )
    })
  })

  it('submits package manager form with all fields', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open>
          <DialogFormRunMcpServerWithCommand isOpen onOpenChange={vi.fn()} />
        </Dialog>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Switch to package manager tab
    await userEvent.click(screen.getByRole('tab', { name: 'Package manager' }))

    // Fill all fields
    await userEvent.type(screen.getByLabelText('Name'), 'npm-server')
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(screen.getByLabelText('Target port'), '8080')
    await userEvent.click(screen.getByLabelText('Protocol'))
    await userEvent.click(screen.getByRole('option', { name: 'npx' }))
    await userEvent.type(screen.getByLabelText('Package name'), '@test/package')
    await userEvent.type(screen.getByLabelText('Command arguments'), '--debug')

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            name: 'npm-server',
            transport: 'stdio',
            target_port: 8080,
            protocol: 'npx',
            package_name: '@test/package',
            type: 'package_manager',
            cmd_arguments: ['--debug'],
          }),
        },
        expect.any(Object)
      )
    })
  })

  it('handles secrets correctly - both inline and from store', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open>
          <DialogFormRunMcpServerWithCommand isOpen onOpenChange={vi.fn()} />
        </Dialog>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill basic fields
    await userEvent.type(screen.getByLabelText('Name'), 'secret-server')
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByLabelText('Docker image'),
      'ghcr.io/test/server'
    )

    // Add inline secret
    await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
    await userEvent.type(screen.getByLabelText('Secret key'), 'API_TOKEN')
    await userEvent.type(screen.getByLabelText('Secret value'), 'secret-value')

    // Add secret from store
    await userEvent.click(screen.getByRole('button', { name: 'Add secret' }))
    await userEvent.type(
      screen.getAllByLabelText('Secret key')[1] as HTMLElement,
      'GITHUB_TOKEN'
    )
    await userEvent.click(
      screen.getAllByLabelText('Use a secret from the store')[1] as HTMLElement
    )

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Secrets store' })
      ).toBeVisible()
    })

    await userEvent.click(
      screen.getByRole('option', { name: 'SECRET_FROM_STORE' })
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          data: expect.objectContaining({
            secrets: [
              {
                name: 'API_TOKEN',
                value: {
                  isFromStore: false,
                  secret: 'secret-value',
                },
              },
              {
                name: 'GITHUB_TOKEN',
                value: {
                  isFromStore: true,
                  secret: 'SECRET_FROM_STORE',
                },
              },
            ],
          }),
        },
        expect.any(Object)
      )
    })
  })

  it('validates required fields and shows errors', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open>
          <DialogFormRunMcpServerWithCommand isOpen onOpenChange={vi.fn()} />
        </Dialog>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Try to submit without filling required fields
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).not.toHaveBeenCalled()
    })

    // Check that validation errors are shown
    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveAttribute(
        'aria-invalid',
        'true'
      )
      expect(screen.getByLabelText('Docker image')).toHaveAttribute(
        'aria-invalid',
        'true'
      )
    })
  })

  it('shows loading state when submitting', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open>
          <DialogFormRunMcpServerWithCommand isOpen onOpenChange={vi.fn()} />
        </Dialog>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await userEvent.type(screen.getByLabelText('Name'), 'test-server')
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByLabelText('Docker image'),
      'ghcr.io/test/server'
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    // The loading state should be shown
    await waitFor(() => {
      expect(
        screen.getByText(/installing server|creating secrets/i)
      ).toBeInTheDocument()
    })
  })

  it('closes dialog on successful submission', async () => {
    const mockInstallServerMutation = vi.fn()
    const mockCheckServerStatus = vi.fn()
    const mockOnOpenChange = vi.fn()

    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: mockCheckServerStatus,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open>
          <DialogFormRunMcpServerWithCommand
            isOpen
            onOpenChange={mockOnOpenChange}
          />
        </Dialog>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await userEvent.type(screen.getByLabelText('Name'), 'test-server')
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByLabelText('Docker image'),
      'ghcr.io/test/server'
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalled()
    })

    // Simulate successful submission
    const onSuccessCallback =
      mockInstallServerMutation.mock.calls[0]?.[1]?.onSuccess

    await act(async () => {
      onSuccessCallback?.()
    })

    await waitFor(() => {
      expect(mockCheckServerStatus).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('can cancel and close dialog', async () => {
    const mockOnOpenChange = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open>
          <DialogFormRunMcpServerWithCommand
            isOpen
            onOpenChange={mockOnOpenChange}
          />
        </Dialog>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('paste arg from clipboard into command arguments field', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Dialog open>
          <DialogFormRunMcpServerWithCommand isOpen onOpenChange={vi.fn()} />
        </Dialog>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.type(screen.getByLabelText('Name'), 'npm-server')
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByLabelText('Docker image'),
      'ghcr.io/test/server'
    )

    const commandArgsInput = screen.getByLabelText('Command arguments')
    await userEvent.click(commandArgsInput)

    await userEvent.paste('--toolsets repos,issues,pull_requests --read-only')

    expect(screen.getByText('--toolsets')).toBeVisible()
    expect(screen.getByText('repos,issues,pull_requests')).toBeVisible()
    expect(screen.getByText('--read-only')).toBeVisible()

    expect(commandArgsInput).toHaveValue('')
    expect(screen.getByText('repos,issues,pull_requests')).toBeVisible()
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cmd_arguments: [
              '--toolsets',
              'repos,issues,pull_requests',
              '--read-only',
            ],
          }),
        }),
        expect.any(Object)
      )
    })
  })
})
