import { render, waitFor, screen, act } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import { DialogFormLocalMcp } from '../dialog-form-local-mcp'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/common/components/ui/dialog'
import { server as mswServer } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRunCustomServer } from '../../../hooks/use-run-custom-server'
import { mswEndpoint } from '@/common/mocks/customHandlers'

// Mock the hook
vi.mock('../../../hooks/use-run-custom-server', () => ({
  useRunCustomServer: vi.fn(),
}))

const mockUseRunCustomServer = vi.mocked(useRunCustomServer)

window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <Dialog open>{children}</Dialog>
)

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

describe('DialogFormLocalMcp', () => {
  it('renders form fields correctly for docker image', async () => {
    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
      </Wrapper>
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
    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Transport')).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Docker image' })
    ).toBeInTheDocument()
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

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'test-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
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
            cmd_arguments: [],
            networkIsolation: false,
            allowedHosts: [],
            allowedPorts: [],
            target_port: 0,
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

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Switch to package manager radio button
    await userEvent.click(
      screen.getByRole('radio', { name: 'Package manager' })
    )

    // Fill all fields
    await userEvent.type(
      screen.getByRole('textbox', {
        name: /server name/i,
      }),
      'npm-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: /sse/i }))
    await userEvent.type(screen.getByLabelText('Target port'), '8080')
    await userEvent.click(
      screen.getByRole('radio', {
        name: /package manager/i,
      })
    )
    await waitFor(() => {
      expect(
        screen.getByRole('radio', {
          name: /package manager/i,
        })
      ).toBeChecked()
    })
    // Open the package manager dropdown and select npx
    await userEvent.click(screen.getByRole('combobox', { name: /protocol/i }))
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
            transport: 'sse',
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

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill basic fields
    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'secret-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
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

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
      </Wrapper>
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
      expect(screen.getByRole('textbox', { name: /name/i })).toHaveAttribute(
        'aria-invalid',
        'true'
      )
      expect(
        screen.getByRole('textbox', { name: 'Docker image' })
      ).toHaveAttribute('aria-invalid', 'true')
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

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'test-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
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

  it('renders aria-hidden column labels for storage volumes', async () => {
    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(screen.getByText('Storage volumes')).toBeInTheDocument()

    const hostLabel = screen.getByText('Host path')
    const containerLabel = screen.getByText('Container path')

    expect(hostLabel).toBeVisible()
    expect(containerLabel).toBeVisible()
    expect(hostLabel).toHaveAttribute('aria-hidden', 'true')
    expect(containerLabel).toHaveAttribute('aria-hidden', 'true')
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

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={mockOnOpenChange} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'test-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
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
      expect(mockOnOpenChange).toHaveBeenCalled()
    })
  })

  it('can cancel and close dialog', async () => {
    const mockOnOpenChange = vi.fn()

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={mockOnOpenChange} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockOnOpenChange).toHaveBeenCalled()
  })

  describe('Network Isolation', () => {
    it('submits correct payload with network isolation enabled', async () => {
      const mockInstallServerMutation = vi.fn()
      mockUseRunCustomServer.mockReturnValue({
        installServerMutation: mockInstallServerMutation,
        checkServerStatus: vi.fn(),
        isErrorSecrets: false,
        isPendingSecrets: false,
      })

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      await userEvent.type(
        screen.getByRole('textbox', { name: /name/i }),
        'test-server'
      )
      await userEvent.click(screen.getByLabelText('Transport'))
      await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Docker image' }),
        'ghcr.io/test/server'
      )

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)

      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      await userEvent.click(switchLabel)

      const addHostBtn = screen.getByRole('button', { name: /add a host/i })
      await userEvent.click(addHostBtn)
      const hostInput = screen.getByLabelText('Host 1')
      await userEvent.type(hostInput, 'example.com')

      const addPortBtn = screen.getByRole('button', { name: /add a port/i })
      await userEvent.click(addPortBtn)
      const portInput = screen.getByLabelText('Port 1')
      await userEvent.type(portInput, '8080')

      await userEvent.click(
        screen.getByRole('button', { name: 'Install server' })
      )

      await waitFor(() => {
        expect(mockInstallServerMutation).toHaveBeenCalled()
      })

      const submittedData = mockInstallServerMutation.mock.calls[0]?.[0]?.data
      expect(submittedData).toMatchObject({
        name: 'test-server',
        type: 'docker_image',
        transport: 'stdio',
        image: 'ghcr.io/test/server',
        networkIsolation: true,
        allowedHosts: [{ value: 'example.com' }],
        allowedPorts: [{ value: '8080' }],
      })
    })

    it('submits correct payload with network isolation disabled', async () => {
      const mockInstallServerMutation = vi.fn()
      mockUseRunCustomServer.mockReturnValue({
        installServerMutation: mockInstallServerMutation,
        checkServerStatus: vi.fn(),
        isErrorSecrets: false,
        isPendingSecrets: false,
      })

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      await userEvent.type(
        screen.getByRole('textbox', { name: /name/i }),
        'test-server'
      )
      await userEvent.click(screen.getByLabelText('Transport'))
      await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Docker image' }),
        'ghcr.io/test/server'
      )

      await userEvent.click(
        screen.getByRole('button', { name: 'Install server' })
      )

      await waitFor(() => {
        expect(mockInstallServerMutation).toHaveBeenCalled()
      })

      const submittedData = mockInstallServerMutation.mock.calls[0]?.[0]?.data
      expect(submittedData).toMatchObject({
        name: 'test-server',
        type: 'docker_image',
        transport: 'stdio',
        image: 'ghcr.io/test/server',
        networkIsolation: false,
      })
    })

    it('resets tab to configuration when canceling', async () => {
      const mockOnOpenChange = vi.fn()

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp isOpen closeDialog={mockOnOpenChange} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)
      expect(networkTab).toHaveAttribute('aria-selected', 'true')

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(mockOnOpenChange).toHaveBeenCalled()

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp isOpen closeDialog={mockOnOpenChange} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      const configTab = screen.getByRole('tab', { name: /configuration/i })
      expect(configTab).toHaveAttribute('aria-selected', 'true')
    })

    it('activates the network isolation tab if a validation error occurs there while on the configuration tab', async () => {
      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      const configTab = screen.getByRole('tab', { name: /configuration/i })
      expect(configTab).toHaveAttribute('aria-selected', 'true')

      await userEvent.type(
        screen.getByRole('textbox', { name: /name/i }),
        'test-server'
      )
      await userEvent.click(screen.getByLabelText('Transport'))
      await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Docker image' }),
        'ghcr.io/test/server'
      )

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)
      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      await userEvent.click(switchLabel)

      const addHostBtn = screen.getByRole('button', { name: /add a host/i })
      await userEvent.click(addHostBtn)
      const hostInput = screen.getByLabelText('Host 1')
      await userEvent.type(hostInput, 'not a host')
      await userEvent.tab()

      await userEvent.click(configTab)
      expect(configTab).toHaveAttribute('aria-selected', 'true')

      await userEvent.click(
        screen.getByRole('button', { name: 'Install server' })
      )

      await waitFor(() => {
        expect(networkTab).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('activates the configuration tab if a validation error occurs there while on the network isolation tab', async () => {
      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)
      expect(networkTab).toHaveAttribute('aria-selected', 'true')

      await userEvent.click(
        screen.getByRole('button', { name: 'Install server' })
      )

      const configTab = screen.getByRole('tab', { name: /configuration/i })
      expect(configTab).toHaveAttribute('aria-selected', 'true')
    })

    it('shows alert when network isolation is enabled but no hosts or ports are configured', async () => {
      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)

      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      await userEvent.click(switchLabel)

      await waitFor(() => {
        expect(
          screen.getByText(
            'This configuration blocks all outbound network traffic from the MCP server.'
          )
        ).toBeInTheDocument()
      })

      const addHostBtn = screen.getByRole('button', { name: /add a host/i })
      await userEvent.click(addHostBtn)
      const hostInput = screen.getByLabelText('Host 1')
      await userEvent.type(hostInput, 'example.com')

      await waitFor(() => {
        expect(
          screen.queryByText(
            'This configuration blocks all outbound network traffic from the MCP server.'
          )
        ).not.toBeInTheDocument()
      })
    })

    it('skip allowedHosts and allowedPorts validation when network isolation is disabled', async () => {
      const mockInstallServerMutation = vi.fn()
      mockUseRunCustomServer.mockReturnValue({
        installServerMutation: mockInstallServerMutation,
        checkServerStatus: vi.fn(),
        isErrorSecrets: false,
        isPendingSecrets: false,
      })

      renderWithProviders(
        <Wrapper>
          <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      await userEvent.type(
        screen.getByRole('textbox', { name: /name/i }),
        'test-server'
      )
      await userEvent.click(screen.getByLabelText('Transport'))
      await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Docker image' }),
        'ghcr.io/test/server'
      )

      const networkTab = screen.getByRole('tab', { name: /network isolation/i })
      await userEvent.click(networkTab)

      // Enable network isolation first
      const switchLabel = screen.getByLabelText(
        'Enable outbound network filtering'
      )
      await userEvent.click(switchLabel)

      const addHostBtn = screen.getByRole('button', { name: /add a host/i })
      await userEvent.click(addHostBtn)
      const hostInput = screen.getByLabelText('Host 1')
      await userEvent.type(hostInput, '232342') // Invalid host format

      const addPortBtn = screen.getByRole('button', { name: /add a port/i })
      await userEvent.click(addPortBtn)
      const portInput = screen.getByLabelText('Port 1')
      await userEvent.type(portInput, '99999') // Invalid port (out of range)

      await waitFor(() => {
        expect(screen.getByText('Invalid host format')).toBeInTheDocument()
        expect(
          screen.getByText('Port must be a number between 1 and 65535')
        ).toBeInTheDocument()
      })

      // Disable network isolation
      await userEvent.click(switchLabel)

      await waitFor(() => {
        expect(
          screen.queryByText('Invalid host format')
        ).not.toBeInTheDocument()
        expect(
          screen.queryByText('Port must be a number between 1 and 65535')
        ).not.toBeInTheDocument()
      })

      const configTab = screen.getByRole('tab', { name: /configuration/i })
      await userEvent.click(configTab)

      await userEvent.click(
        screen.getByRole('button', { name: 'Install server' })
      )

      await waitFor(() => {
        expect(mockInstallServerMutation).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              name: 'test-server',
              type: 'docker_image',
              image: 'ghcr.io/test/server',
              transport: 'stdio',
              networkIsolation: false,
              allowedHosts: [{ value: '232342' }],
              allowedPorts: [{ value: '99999' }],
            }),
          }),
          expect.any(Object)
        )
      })
    })
  })

  it('paste arg from clipboard into command arguments field', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunCustomServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormLocalMcp isOpen closeDialog={vi.fn()} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.type(
      screen.getByRole('textbox', { name: /name/i }),
      'npm-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(screen.getByRole('option', { name: 'stdio' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Docker image' }),
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
