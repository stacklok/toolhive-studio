import type {
  RegistryEnvVar,
  RegistryImageMetadata,
} from '@/common/api/generated'
import { render, screen, waitFor, act } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import { FormRunFromRegistry } from '../form-run-from-registry'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/common/mocks/node'
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

  it('renders tabs, allows switching to Network Isolation, and toggles the switch', async () => {
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
    // Tablist and both tabs present
    const tabList = screen.getByRole('tablist')
    expect(tabList).toBeInTheDocument()
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    expect(configTab).toBeInTheDocument()
    expect(networkTab).toBeInTheDocument()
    expect(configTab).toHaveAttribute('aria-selected', 'true')
    expect(networkTab).toHaveAttribute('aria-selected', 'false')

    // Switch to the Network Isolation tab
    await userEvent.click(networkTab)
    expect(networkTab).toHaveAttribute('aria-selected', 'true')
    expect(configTab).toHaveAttribute('aria-selected', 'false')

    // The Network isolation switch should be visible and toggleable
    const switchLabel = screen.getByLabelText('Network isolation')
    expect(switchLabel).toBeInTheDocument()
    expect(switchLabel).toHaveAttribute('role', 'switch')
    expect(switchLabel).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(switchLabel)
    expect(switchLabel).toHaveAttribute('aria-checked', 'true')

    // The form fields should not be visible
    expect(screen.queryByLabelText('Server name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Command arguments')).not.toBeInTheDocument()
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

  it('calls installServerMutation when form is submitted with valid data', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
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

    // Fill in the form
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
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          server,
          data: expect.objectContaining({
            serverName: 'my-awesome-server',
            envVars: [
              {
                name: 'ENV_VAR',
                value: 'my-awesome-env-var',
              },
            ],
            secrets: [
              {
                name: 'SECRET',
                value: {
                  isFromStore: false,
                  secret: 'my-awesome-secret',
                },
              },
            ],
            cmd_arguments: undefined,
          }),
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onSettled: expect.any(Function),
          onError: expect.any(Function),
        })
      )
      // Ensure networkIsolation is not present in the payload
      expect(
        mockInstallServerMutation.mock.calls[0]?.[0]?.data?.networkIsolation
      ).toBeUndefined()
    })
  })

  it('handles form submission with secret from store', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    server.use(
      http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
        return HttpResponse.json({
          keys: [
            {
              key: 'MY_AWESOME_SECRET',
            },
          ],
        })
      })
    )

    const mockServer = { ...REGISTRY_SERVER }
    mockServer.env_vars = ENV_VARS_OPTIONAL

    render(
      <QueryClientProvider client={queryClient}>
        <FormRunFromRegistry
          isOpen={true}
          onOpenChange={vi.fn()}
          server={mockServer}
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

    // Select secret from store
    await userEvent.click(screen.getByLabelText('Use a secret from the store'))
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Secrets store' })
      ).toBeVisible()
    })
    await userEvent.click(
      screen.getByRole('option', { name: 'MY_AWESOME_SECRET' })
    )

    // Fill in environment variable
    await userEvent.type(
      screen.getByLabelText('ENV_VAR value'),
      'my-awesome-env-var'
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          server: mockServer,
          data: expect.objectContaining({
            serverName: 'my-awesome-server',
            envVars: [
              {
                name: 'ENV_VAR',
                value: 'my-awesome-env-var',
              },
            ],
            secrets: [
              {
                name: 'SECRET',
                value: {
                  isFromStore: true,
                  secret: 'MY_AWESOME_SECRET',
                },
              },
            ],
            cmd_arguments: undefined,
          }),
        },
        expect.any(Object)
      )
      // Ensure networkIsolation is not present in the payload
      expect(
        mockInstallServerMutation.mock.calls[0]?.[0]?.data?.networkIsolation
      ).toBeUndefined()
    })
  })

  it('submits form with empty optional fields', async () => {
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

    // Only fill in server name
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
        {
          server,
          data: expect.objectContaining({
            serverName: 'my-awesome-server',
            envVars: [
              {
                name: 'ENV_VAR',
                value: '',
              },
            ],
            secrets: [
              {
                name: 'SECRET',
                value: {
                  isFromStore: false,
                  secret: '',
                },
              },
            ],
            cmd_arguments: undefined,
          }),
        },
        expect.any(Object)
      )
      // Ensure networkIsolation is not present in the payload
      expect(
        mockInstallServerMutation.mock.calls[0]?.[0]?.data?.networkIsolation
      ).toBeUndefined()
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

  it('submits correct network isolation policy when enabled or disabled', async () => {
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

    // --- Test with network isolation enabled ---
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
          data: expect.objectContaining({
            // This is the expected policy when network isolation is enabled
            permission_profile: expect.objectContaining({
              network: expect.objectContaining({
                outbound: expect.objectContaining({
                  insecure_allow_all: false,
                  allow_host: [],
                  allow_port: [],
                  allow_transport: [],
                }),
              }),
            }),
          }),
        }),
        expect.any(Object)
      )
    })

    // --- Test with network isolation disabled ---
    // Reset mocks and re-open dialog
    vi.clearAllMocks()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      checkServerStatus: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    // Re-render the form
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

    // Ensure network isolation is not enabled (default is off)
    // Submit the form
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    // Check payload for network isolation disabled (should not include restrictive policy)
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            permission_profile: expect.objectContaining({
              network: expect.objectContaining({
                outbound: expect.objectContaining({
                  insecure_allow_all: false,
                }),
              }),
            }),
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
          data: expect.objectContaining({
            permission_profile: expect.objectContaining({
              network: expect.objectContaining({
                outbound: expect.objectContaining({
                  allow_transport: ['TCP'],
                }),
              }),
            }),
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
          data: expect.objectContaining({
            permission_profile: expect.objectContaining({
              network: expect.objectContaining({
                outbound: expect.objectContaining({
                  allow_transport: expect.arrayContaining(['TCP', 'UDP']),
                }),
              }),
            }),
          }),
        }),
        expect.any(Object)
      )
    })
  })
})
