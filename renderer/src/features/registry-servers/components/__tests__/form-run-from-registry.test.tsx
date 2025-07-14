import type {
  RegistryEnvVar,
  RegistryImageMetadata,
  V1CreateRequest,
} from '@/common/api/generated'
import { render, screen, waitFor, act } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import { FormRunFromRegistry } from '../form-run-from-registry'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server as mswServer } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { mswEndpoint } from '@/common/mocks/msw-endpoint'
import { useRunFromRegistry } from '../../hooks/use-run-from-registry'

// Mock the hook
vi.mock('../../hooks/use-run-from-registry.tsx', () => ({
  useRunFromRegistry: vi.fn(),
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 0,
      staleTime: 0,
    },
  },
})

const REGISTRY_SERVER: RegistryImageMetadata = {
  name: 'foo-bar-server',
  image: 'ghcr.io/foo/bar:latest',
  description: 'foo bar',
  transport: 'stdio',
  permissions: {},
  tools: ['tool-1'],
  env_vars: [
    {
      name: 'ENV_VAR',
      description: 'foo bar',
      required: false,
    },

    {
      name: 'SECRET',
      description: 'foo bar',
      secret: true,
    },
  ],
  args: [],
  metadata: {},
  repository_url: 'https://github.com/foo/bar',
  tags: ['foo', 'bar'],
}

const ENV_VARS_OPTIONAL = [
  {
    name: 'ENV_VAR',
    description: 'foo bar',
    required: false,
  },

  {
    name: 'SECRET',
    description: 'foo bar',
    secret: true,
    required: false,
  },
] as const satisfies RegistryEnvVar[]

const ENV_VARS_REQUIRED = [
  {
    name: 'ENV_VAR',
    description: 'foo bar',
    required: true,
  },

  {
    name: 'SECRET',
    description: 'foo bar',
    secret: true,
    required: true,
  },
] as const satisfies RegistryEnvVar[]

const mockUseRunFromRegistry = vi.mocked(useRunFromRegistry)

beforeEach(() => {
  vi.clearAllMocks()

  // Default mock implementation
  mockUseRunFromRegistry.mockReturnValue({
    installServerMutation: vi.fn(),
    checkServerStatus: vi.fn(),
    isErrorSecrets: false,
    isPendingSecrets: false,
  })
})

describe('FormRunFromRegistry', () => {
  it('renders form fields correctly', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // The form fields should be visible
    expect(screen.getByText(`Configure ${REGISTRY_SERVER.name}`)).toBeVisible()
    expect(screen.getByLabelText('Server name')).toBeInTheDocument()
    expect(screen.getByLabelText('Command arguments')).toBeInTheDocument()
    expect(screen.getByLabelText('SECRET value')).toBeInTheDocument()
    expect(screen.getByLabelText('ENV_VAR value')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Install server' })
    ).toBeInTheDocument()
  })

  it('renders and toggles network isolation UI elements', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // --- Tab switching and toggle ---
    const tabList = screen.getByRole('tablist')
    expect(tabList).toBeInTheDocument()
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    expect(configTab).toBeInTheDocument()
    expect(networkTab).toBeInTheDocument()
    expect(configTab).toHaveAttribute('aria-selected', 'true')
    expect(networkTab).toHaveAttribute('aria-selected', 'false')
    await userEvent.click(networkTab)
    expect(networkTab).toHaveAttribute('aria-selected', 'true')
    expect(configTab).toHaveAttribute('aria-selected', 'false')
    const switchLabel = screen.getByLabelText('Network isolation')
    expect(switchLabel).toBeInTheDocument()
    expect(switchLabel).toHaveAttribute('role', 'switch')
    expect(switchLabel).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(switchLabel)
    expect(switchLabel).toHaveAttribute('aria-checked', 'true')
    // --- Allowed Protocols group visibility ---
    // Should be visible only when enabled
    expect(screen.getByLabelText('Allowed Protocols')).toBeInTheDocument()
    const tcpCheckbox = screen.getByLabelText('TCP')
    const udpCheckbox = screen.getByLabelText('UDP')
    expect(tcpCheckbox).toBeInTheDocument()
    expect(udpCheckbox).toBeInTheDocument()
    expect(tcpCheckbox).not.toBeChecked()
    expect(udpCheckbox).not.toBeChecked()
    await userEvent.click(tcpCheckbox)
    expect(tcpCheckbox).toBeChecked()
    expect(udpCheckbox).not.toBeChecked()
    await userEvent.click(udpCheckbox)
    expect(tcpCheckbox).toBeChecked()
    expect(udpCheckbox).toBeChecked()
    await userEvent.click(tcpCheckbox)
    expect(tcpCheckbox).not.toBeChecked()
    expect(udpCheckbox).toBeChecked()
    // --- Alert when enabled ---
    expect(
      screen.getByText(
        /this configuration blocks all outbound network traffic from the mcp server/i
      )
    ).toBeInTheDocument()
  })

  it('shows loading state and hides tabs when submitting', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    await userEvent.type(screen.getByLabelText('Server name'), 'my-server', {
      initialSelectionStart: 0,
      initialSelectionEnd: REGISTRY_SERVER.name?.length,
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    // The loading/progress state should be visible
    await waitFor(() => {
      expect(
        screen.getByText(/installing server|creating secrets/i)
      ).toBeInTheDocument()
    })
    // The tabs should not be visible
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('submits correct payload for various form states', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    // --- Scenario 1: Valid data ---
    let server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    const mockOnOpenChange = vi.fn()
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-awesome-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )
    await userEvent.type(
      screen.getByLabelText('SECRET value'),
      'my-awesome-secret'
    )
    await userEvent.type(
      screen.getByLabelText('ENV_VAR value'),
      'my-awesome-env-var'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    await waitFor(() => {
      expect(
        mockInstallServerMutation.mock.calls[0]?.[0]?.data?.networkIsolation
      ).toBe(false)
    })

    // --- Scenario 2: Secret from store ---
    vi.clearAllMocks()
    // Restore MSW mock for secrets endpoint
    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
        return HttpResponse.json({
          keys: [{ key: 'MY_AWESOME_SECRET' }],
        })
      })
    )
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-awesome-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )
    // Simulate secret store selection
    await userEvent.click(screen.getByLabelText('Use a secret from the store'))
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Secrets store' })
      ).toBeVisible()
    })
    await userEvent.click(
      screen.getByRole('option', { name: 'MY_AWESOME_SECRET' })
    )
    await userEvent.type(
      screen.getByLabelText('ENV_VAR value'),
      'my-awesome-env-var'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    // --- Scenario 3: Empty optional fields ---
    vi.clearAllMocks()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-awesome-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            serverName: 'my-awesome-server',
            cmd_arguments: undefined,
            envVars: [{ name: 'ENV_VAR', value: '' }],
            secrets: [
              { name: 'SECRET', value: { isFromStore: false, secret: '' } },
            ],
            networkIsolation: false,
            allowedHosts: [],
            allowedPorts: [],
            allowedProtocols: [],
          }),
        }),
        expect.any(Object)
      )
    })

    // --- Scenario 4: Command arguments ---
    vi.clearAllMocks()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-awesome-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )
    await userEvent.type(
      screen.getByLabelText('Command arguments'),
      '--debug --verbose'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            serverName: 'my-awesome-server',
            cmd_arguments: '--debug --verbose',
            envVars: [{ name: 'ENV_VAR', value: '' }],
            secrets: [
              { name: 'SECRET', value: { isFromStore: false, secret: '' } },
            ],
            networkIsolation: false,
            allowedHosts: [],
            allowedPorts: [],
            allowedProtocols: [],
          }),
        }),
        expect.any(Object)
      )
    })
  })

  it('validates required fields and shows errors', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_REQUIRED

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Only fill in server name, leave required fields empty
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-awesome-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).not.toHaveBeenCalled()
    })

    // Check that validation errors are shown
    await waitFor(() => {
      expect(screen.getByLabelText('SECRET value')).toHaveAttribute(
        'aria-invalid',
        'true'
      )
    })

    expect(screen.getByLabelText('ENV_VAR value')).toHaveAttribute(
      'aria-invalid',
      'true'
    )
  })

  it('shows loading state when submitting', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill in server name
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-awesome-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )

    // Click submit to trigger loading state
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    // The loading state should be shown
    await waitFor(() => {
      expect(screen.getByText('Installing server...')).toBeInTheDocument()
    })
    expect(
      screen.getByText(
        'We are pulling the server image from the registry and installing it.'
      )
    ).toBeInTheDocument()
  })

  it('shows secrets loading state when isPendingSecrets is true', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: true,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill in server name
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-awesome-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )

    // Click submit to trigger loading state
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    // The loading state should be shown
    await waitFor(() => {
      expect(screen.getByText('Creating Secrets...')).toBeInTheDocument()
    })
  })

  it('shows error state when isErrorSecrets is true', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: true,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill in server name
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-awesome-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )

    // Click submit to trigger the mutation
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    // Wait for the mutation to be called
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalled()
    })

    // Simulate the error callback and the settled callback to reset isSubmitting
    const onErrorCallback =
      mockInstallServerMutation.mock.calls[0]?.[1]?.onError
    const onSettledCallback =
      mockInstallServerMutation.mock.calls[0]?.[1]?.onSettled

    await act(async () => {
      onErrorCallback?.(new Error('Something went wrong'))
      onSettledCallback?.(undefined, new Error('Something went wrong'))
    })

    // The error state should be shown
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/We were unable to create the secrets for the server/)
    ).toBeInTheDocument()
  })

  it('closes dialog on successful submission', async () => {
    const mockInstallServerMutation = vi.fn()
    const mockCheckServerStatus = vi.fn()
    const mockOnOpenChange = vi.fn()

    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: mockCheckServerStatus,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill in server name
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-awesome-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )

    // Click submit
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalled()
    })

    // Simulate successful submission
    const onSuccessCallback =
      mockInstallServerMutation.mock.calls[0]?.[1]?.onSuccess
    onSuccessCallback?.()

    await waitFor(() => {
      expect(mockCheckServerStatus).toHaveBeenCalled()
    })
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('includes command arguments in form data', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill in form fields
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-awesome-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )

    await userEvent.type(
      screen.getByLabelText('Command arguments'),
      '--debug --verbose'
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          server,
          data: expect.objectContaining({
            cmd_arguments: '--debug --verbose',
          }),
        },
        expect.any(Object)
      )
    })
  })

  it('shows an alert when network isolation is enabled', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // Switch to the Network Isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)

    // Enable the switch
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)

    // The alert should appear
    expect(
      screen.getByText(
        /this configuration blocks all outbound network traffic from the mcp server/i
      )
    ).toBeInTheDocument()
  })

  it('shows the alert only when at least one of hosts, ports, or protocols is empty', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // Switch to the Network Isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    // Enable the switch
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)

    // By default, all are empty, so alert should show
    expect(
      screen.getByText(
        /this configuration blocks all outbound network traffic from the mcp server/i
      )
    ).toBeInTheDocument()

    // Add a host
    const addHostBtn = screen.getByRole('button', { name: /add a host/i })
    await userEvent.click(addHostBtn)
    const hostInput = screen.getByLabelText('Host 1')
    await userEvent.type(hostInput, 'example.com')
    // Still missing ports and protocols, so alert should show
    expect(
      screen.getByText(
        /this configuration blocks all outbound network traffic from the mcp server/i
      )
    ).toBeInTheDocument()

    // Add a port
    const addPortBtn = screen.getByRole('button', { name: /add a port/i })
    await userEvent.click(addPortBtn)
    const portInput = screen.getByLabelText('Port 1')
    await userEvent.type(portInput, '8080')
    // Still missing protocols, so alert should show
    expect(
      screen.getByText(
        /this configuration blocks all outbound network traffic from the mcp server/i
      )
    ).toBeInTheDocument()

    // Add a protocol
    const tcpCheckbox = screen.getByLabelText('TCP')
    await userEvent.click(tcpCheckbox)
    // Now all three have at least one value, so alert should NOT show
    expect(
      screen.queryByText(
        /this configuration blocks all outbound network traffic from the mcp server/i
      )
    ).not.toBeInTheDocument()

    // Remove the host, alert should show again
    const removeHostBtn = screen.getByLabelText('Remove Host 1')
    await userEvent.click(removeHostBtn)
    expect(
      screen.getByText(
        /this configuration blocks all outbound network traffic from the mcp server/i
      )
    ).toBeInTheDocument()
  })

  it('submits correct network isolation policy and allowed protocols', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    // --- Scenario 1: Network isolation enabled, no protocols selected ---
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-network-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )
    // Switch to the Network Isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    // Enable the switch
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)
    // Switch back to configuration tab to submit
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    await userEvent.click(configTab)
    // Submit the form
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    // Check payload for network isolation enabled
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            serverName: 'my-network-server',
            allowedProtocols: [],
            networkIsolation: true,
          }),
        }),
        expect.any(Object)
      )
    })

    // --- Scenario 2: Network isolation disabled ---
    vi.clearAllMocks()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-network-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )
    // Ensure network isolation is not enabled (default is off)
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    // Check payload for network isolation disabled (should not include restrictive policy)
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            serverName: 'my-network-server',
            networkIsolation: false,
            allowedProtocols: [],
            allowedHosts: [],
            allowedPorts: [],
          }),
        }),
        expect.any(Object)
      )
    })

    // --- Allowed Protocols: only TCP ---
    vi.clearAllMocks()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-network-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )
    const networkTab2 = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab2)
    const switchLabel2 = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel2)
    const tcpCheckbox = screen.getByLabelText('TCP')
    await userEvent.click(tcpCheckbox)
    const configTab2 = screen.getByRole('tab', { name: /configuration/i })
    await userEvent.click(configTab2)
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            serverName: 'my-network-server',
            allowedProtocols: ['TCP'],
            networkIsolation: true,
          }),
        }),
        expect.any(Object)
      )
    })

    // --- Allowed Protocols: TCP and UDP ---
    vi.clearAllMocks()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-network-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )
    const networkTab3 = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab3)
    const switchLabel3 = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel3)
    const tcpCheckbox2 = screen.getByLabelText('TCP')
    const udpCheckbox2 = screen.getByLabelText('UDP')
    await userEvent.click(tcpCheckbox2)
    await userEvent.click(udpCheckbox2)
    const configTab3 = screen.getByRole('tab', { name: /configuration/i })
    await userEvent.click(configTab3)
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            serverName: 'my-network-server',
            allowedProtocols: ['TCP', 'UDP'],
            networkIsolation: true,
          }),
        }),
        expect.any(Object)
      )
    })
  })

  it('shows Allowed Protocols checkbox group only when network isolation is enabled', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Switch to the Network Isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)

    // Initially, the Allowed Protocols group should not be visible
    expect(screen.queryByLabelText('Allowed Protocols')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('TCP')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('UDP')).not.toBeInTheDocument()

    // Enable network isolation
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)

    // Now the Allowed Protocols group should be visible
    expect(screen.getByLabelText('Allowed Protocols')).toBeInTheDocument()
    const tcpCheckbox = screen.getByLabelText('TCP')
    const udpCheckbox = screen.getByLabelText('UDP')
    expect(tcpCheckbox).toBeInTheDocument()
    expect(udpCheckbox).toBeInTheDocument()

    // Both should be unchecked by default
    expect(tcpCheckbox).not.toBeChecked()
    expect(udpCheckbox).not.toBeChecked()

    // Check TCP
    await userEvent.click(tcpCheckbox)
    expect(tcpCheckbox).toBeChecked()
    expect(udpCheckbox).not.toBeChecked()

    // Check UDP
    await userEvent.click(udpCheckbox)
    expect(tcpCheckbox).toBeChecked()
    expect(udpCheckbox).toBeChecked()

    // Uncheck TCP
    await userEvent.click(tcpCheckbox)
    expect(tcpCheckbox).not.toBeChecked()
    expect(udpCheckbox).toBeChecked()
  })

  it('includes selected Allowed Protocols in the API payload when network isolation is enabled', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill in required fields
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-network-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )

    // Switch to the Network Isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)

    // Enable network isolation
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)

    // Select TCP only
    const tcpCheckbox = screen.getByLabelText('TCP')
    await userEvent.click(tcpCheckbox)

    // Switch back to configuration tab to submit
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    await userEvent.click(configTab)

    // Submit the form
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    // Check payload for TCP only
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            serverName: 'my-network-server',
            allowedProtocols: ['TCP'],
            networkIsolation: true,
          }),
        }),
        expect.any(Object)
      )
    })

    // Now select both TCP and UDP
    vi.clearAllMocks()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill in required fields again
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-network-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )

    // Switch to the Network Isolation tab
    const networkTab2 = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab2)

    // Enable network isolation
    const switchLabel2 = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel2)

    // Select TCP and UDP
    const tcpCheckbox2 = screen.getByLabelText('TCP')
    const udpCheckbox2 = screen.getByLabelText('UDP')
    await userEvent.click(tcpCheckbox2)
    await userEvent.click(udpCheckbox2)

    // Switch back to configuration tab to submit
    const configTab2 = screen.getByRole('tab', { name: /configuration/i })
    await userEvent.click(configTab2)

    // Submit the form
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    // Check payload for both TCP and UDP
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            serverName: 'my-network-server',
            allowedProtocols: ['TCP', 'UDP'],
            networkIsolation: true,
          }),
        }),
        expect.any(Object)
      )
    })
  })

  it.skip('shows Allowed Ports section and submits correct payload when ports are added', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // Switch to Network Isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    // Enable network isolation
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)
    // Add ports
    const addPortButton = screen.getByRole('button', { name: 'Add a port' })
    await userEvent.click(addPortButton)
    await userEvent.type(screen.getByLabelText('Port 1'), '8080')
    await userEvent.click(addPortButton)
    await userEvent.type(screen.getByLabelText('Port 2'), '443')
    // Submit
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    await userEvent.click(configTab)
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    await waitFor(() => {
      const expected: V1CreateRequest = {
        name: 'foo-bar-server',
        image: REGISTRY_SERVER.image,
        transport: REGISTRY_SERVER.transport,
        env_vars: ['ENV_VAR='],
        secrets: [],
        cmd_arguments: undefined,
        permission_profile: {
          network: {
            outbound: {
              allow_port: [8080, 443],
              allow_host: [],
              allow_transport: [],
              insecure_allow_all: false,
            },
          },
        },
      }
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        { server, data: expected },
        expect.any(Object)
      )
    })
  })

  it('shows Allowed Ports section and submits correct payload when no ports are added', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // Switch to Network Isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    // Enable network isolation
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)
    // Do not add any ports
    // Submit
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    await userEvent.click(configTab)
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            serverName: 'foo-bar-server',
            allowedPorts: [],
            networkIsolation: true,
          }),
        }),
        expect.any(Object)
      )
    })
  })
})

describe('Allowed Hosts field', () => {
  it('renders Allowed Hosts field in the network isolation tab when enabled', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // Switch to the Network Isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    // Enable network isolation
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)
    // Allowed Hosts field should be present
    expect(screen.getByLabelText('Allowed Hosts')).toBeInTheDocument()
    // Add host button should be present
    expect(
      screen.getByRole('button', { name: /add a host/i })
    ).toBeInTheDocument()
  })

  it('allows adding, editing, and removing host entries', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)
    // Add a host
    const addHostButton = screen.getByRole('button', { name: /add a host/i })
    await userEvent.click(addHostButton)
    const hostInput1 = screen.getByLabelText('Host 1')
    await userEvent.type(hostInput1, 'foo.bar.com')
    // Add another host
    await userEvent.click(addHostButton)
    const hostInput2 = screen.getByLabelText('Host 2')
    await userEvent.type(hostInput2, '.example.com')
    // Remove the first host
    const removeHost1 = screen.getByLabelText('Remove Host 1')
    await userEvent.click(removeHost1)
    // Only one host should remain, labeled 'Host 1' and value '.example.com'
    const remainingHost = screen.getByLabelText('Host 1')
    expect(remainingHost).toBeInTheDocument()
    expect(remainingHost).toHaveValue('.example.com')
    expect(screen.queryByLabelText('Host 2')).not.toBeInTheDocument()
  })

  it('validates host format (valid domain or subdomain, can start with a dot)', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)
    const addHostButton = screen.getByRole('button', { name: /add a host/i })
    await userEvent.click(addHostButton)
    const hostInput = screen.getByLabelText('Host 1')
    // Invalid host
    await userEvent.type(hostInput, 'not a host')
    await userEvent.tab()
    expect(screen.getByText(/invalid host/i)).toBeInTheDocument()
    // Valid host
    await userEvent.clear(hostInput)
    await userEvent.type(hostInput, 'google.com')
    await userEvent.tab()
    expect(screen.queryByText(/invalid host/i)).not.toBeInTheDocument()
    // Valid host with dot
    await userEvent.clear(hostInput)
    await userEvent.type(hostInput, '.example.com')
    await userEvent.tab()
    expect(screen.queryByText(/invalid host/i)).not.toBeInTheDocument()
  })

  it('includes allowedHosts in the API payload when submitting the form', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-network-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)
    const addHostButton = screen.getByRole('button', { name: /add a host/i })
    await userEvent.click(addHostButton)
    const hostInput = screen.getByLabelText('Host 1')
    await userEvent.type(hostInput, 'foo.bar.com')
    // Switch back to configuration tab to submit
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    await userEvent.click(configTab)
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            serverName: 'my-network-server',
            allowedHosts: ['foo.bar.com'],
            networkIsolation: true,
          }),
        }),
        expect.any(Object)
      )
    })
  })

  it('is empty by default and can handle multiple hosts', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)
    // Should be empty by default
    expect(screen.queryByLabelText('Host 1')).not.toBeInTheDocument()
    // Add two hosts
    const addHostButton = screen.getByRole('button', { name: /add a host/i })
    await userEvent.click(addHostButton)
    await userEvent.type(screen.getByLabelText('Host 1'), 'foo.bar.com')
    await userEvent.click(addHostButton)
    await userEvent.type(screen.getByLabelText('Host 2'), 'google.com')
    // Both should be present
    expect(screen.getByLabelText('Host 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Host 2')).toBeInTheDocument()
  })
})

describe('Network Isolation Tab Activation', () => {
  it('activates the network isolation tab if a validation error occurs there while on the configuration tab', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // Ensure we are on the configuration tab
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    expect(configTab).toHaveAttribute('aria-selected', 'true')
    // Enable network isolation and add an invalid host
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    const switchLabel = screen.getByLabelText('Network isolation')
    await userEvent.click(switchLabel)
    // Add a host and enter an invalid value
    const addHostBtn = screen.getByRole('button', { name: /add a host/i })
    await userEvent.click(addHostBtn)
    const hostInput = screen.getByLabelText('Host 1')
    await userEvent.type(hostInput, 'not a host')
    await userEvent.tab()
    // Switch back to configuration tab
    await userEvent.click(configTab)
    expect(configTab).toHaveAttribute('aria-selected', 'true')
    // Try to submit the form (should trigger validation error on network isolation tab)
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    // The network isolation tab should now be active
    await waitFor(() => {
      expect(networkTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('activates the configuration tab if a validation error occurs there while on the network isolation tab', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_REQUIRED // Make configuration tab fields required

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={server}
        />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // Switch to the network isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    expect(networkTab).toHaveAttribute('aria-selected', 'true')
    // Try to submit the form (should trigger validation error on configuration tab)
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    // The configuration tab should now be active
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    expect(configTab).toHaveAttribute('aria-selected', 'true')
  })
})
