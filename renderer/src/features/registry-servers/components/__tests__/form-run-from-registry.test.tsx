import type { RegistryEnvVar, RegistryImageMetadata } from '@api/types.gen'
import { render, screen, waitFor, act, within } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach, afterEach } from 'vitest'
import { FormRunFromRegistry } from '../form-run-from-registry'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server as mswServer } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { useRunFromRegistry } from '../../hooks/use-run-from-registry'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'
// Speed up wizard/form transitions by mocking the 2s delay to resolve immediately
vi.mock('../../../../../../utils/delay', () => ({
  delay: () => Promise.resolve(),
}))

// Mock the hook
vi.mock('../../hooks/use-run-from-registry.tsx', () => ({
  useRunFromRegistry: vi.fn(),
}))

vi.mock('@/common/hooks/use-check-server-status', () => ({
  useCheckServerStatus: vi.fn(),
}))

const mockUseCheckServerStatus = vi.mocked(useCheckServerStatus)

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
    description: 'description of env var',
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
    isErrorSecrets: false,
    isPendingSecrets: false,
  })

  mockUseCheckServerStatus.mockReturnValue({
    checkServerStatus: vi.fn(),
  })
})

// Always restore real timers after each test to avoid leaks when a test fails early
afterEach(() => {
  vi.useRealTimers()
})

describe('FormRunFromRegistry', () => {
  it('renders form fields correctly', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
    const formLabel = screen.getByText(/env_var/i).closest('label')
    const tooltipIcon = within(formLabel!).getByTestId('tooltip-info-icon')
    await userEvent.hover(tooltipIcon)
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toBeInTheDocument()
      expect(tooltip).toHaveTextContent('description of env var')
    })
    expect(
      screen.getByRole('button', { name: 'Install server' })
    ).toBeInTheDocument()
  })

  it('renders storage volumes field on configuration tab', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Verify the storage volumes field exists with correct title and description
    expect(screen.getByText('Storage volumes')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Provide the MCP server access to a local folder. Optionally specific individual files.'
      )
    ).toBeInTheDocument()
  })

  it('shows loading state and hides tabs when submitting', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    // --- Scenario 1: Valid data ---
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    const mockOnOpenChange = vi.fn()
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
  })

  it('should not submit the form if the server name is not valid', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    let server = { ...REGISTRY_SERVER }

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
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    renderWithProviders(
      <FormRunFromRegistry
        isOpen
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    server = { ...REGISTRY_SERVER }
    server.args = ['stdio']
    server.env_vars = ENV_VARS_OPTIONAL
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
            name: 'my-awesome-server',
            cmd_arguments: ['stdio'],
            envVars: [{ name: 'ENV_VAR', value: '' }],
            secrets: [
              { name: 'SECRET', value: { isFromStore: false, secret: '' } },
            ],
            networkIsolation: false,
            allowedHosts: [],
            allowedPorts: [],
            volumes: [
              {
                accessMode: 'rw',
                container: '',
                host: '',
              },
            ],
          }),
        }),
        expect.any(Object)
      )
    })

    // --- Scenario 4: Command arguments ---
    vi.clearAllMocks()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
    const commandArgsInput = screen.getByLabelText('Command arguments')
    await userEvent.type(commandArgsInput, '--debug')
    await userEvent.keyboard('{Enter}')
    await userEvent.type(commandArgsInput, '--verbose')
    await userEvent.keyboard('{Enter}')
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            name: 'my-awesome-server',
            cmd_arguments: ['--debug', '--verbose'],
            envVars: [{ name: 'ENV_VAR', value: '' }],
            secrets: [
              { name: 'SECRET', value: { isFromStore: false, secret: '' } },
            ],
            networkIsolation: false,
            allowedHosts: [],
            allowedPorts: [],
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
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_REQUIRED

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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

  it('validates that whitespace-only values are invalid for required fields', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_REQUIRED

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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

    // Fill required fields with whitespace-only values
    await userEvent.type(screen.getByLabelText('ENV_VAR value'), '   ')
    await userEvent.type(screen.getByLabelText('SECRET value'), '\t\n  ')

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).not.toHaveBeenCalled()
    })

    // Check that validation errors are shown for whitespace-only values
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
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
        'Downloading server image from the registry and installing.'
      )
    ).toBeInTheDocument()
  })

  it('shows secrets loading state when isPendingSecrets is true', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: true,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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

  it('passes the selected group to the mutation and uses it for navigation', async () => {
    const mockInstallServerMutation = vi.fn()
    const mockCheckServerStatus = vi.fn()

    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    mockUseCheckServerStatus.mockReturnValue({
      checkServerStatus: mockCheckServerStatus,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )
    await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible())

    const trigger = screen.getByRole('combobox', { name: 'Group' })
    await userEvent.click(trigger)
    const option = await screen.findByRole('option', { name: 'research' })
    await userEvent.click(option)

    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-registry-srv',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalled()
    })

    const firstArgs = mockInstallServerMutation.mock.calls[0]?.[0]
    expect(firstArgs?.groupName).toBe('research')

    // The success flow now runs in onSettled after a short (mocked) delay
    const onSettled = mockInstallServerMutation.mock.calls[0]?.[1]?.onSettled
    await act(async () => {
      onSettled?.(undefined, undefined)
    })
    await waitFor(() => {
      expect(mockCheckServerStatus).toHaveBeenCalledWith(
        expect.objectContaining({ groupName: 'research' })
      )
    })
  })

  it('uses the default group when user does not change selection', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.type(screen.getByLabelText('Server name'), 'srv', {
      initialSelectionStart: 0,
      initialSelectionEnd: REGISTRY_SERVER.name?.length,
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalled()
    })
    const firstArgs = mockInstallServerMutation.mock.calls[0]?.[0]
    expect(firstArgs?.groupName).toBe('default')
  })

  it('shows error state when isErrorSecrets is true', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: true,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
      screen.getByText(/Failed to create secrets for the server/)
    ).toBeInTheDocument()
  })

  it('closes dialog on successful submission', async () => {
    const mockInstallServerMutation = vi.fn()
    const mockCheckServerStatus = vi.fn()
    const mockOnOpenChange = vi.fn()

    mockUseCheckServerStatus.mockReturnValue({
      checkServerStatus: mockCheckServerStatus,
    })

    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        server={server}
        actionsSubmitLabel="Install server"
      />
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

    // Simulate success via onSettled (delay mocked to 0)
    const onSettled = mockInstallServerMutation.mock.calls[0]?.[1]?.onSettled
    await act(async () => {
      onSettled?.(undefined, undefined)
    })

    await waitFor(() => {
      expect(mockCheckServerStatus).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('includes command arguments in form data', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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

    const commandArgsInput = screen.getByLabelText('Command arguments')
    await userEvent.type(commandArgsInput, '--debug')
    await userEvent.keyboard('{Enter}')
    await userEvent.type(commandArgsInput, '--verbose')
    await userEvent.keyboard('{Enter}')

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server,
          data: expect.objectContaining({
            cmd_arguments: ['--debug', '--verbose'],
          }),
        }),
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
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // Switch to Network Isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    // Enable network isolation
    const switchLabel = screen.getByLabelText(
      'Enable outbound network filtering'
    )
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
            name: 'foo-bar-server',
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
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // Switch to the Network Isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)
    // Enable network isolation
    const switchLabel = screen.getByLabelText(
      'Enable outbound network filtering'
    )
    await userEvent.click(switchLabel)
    // Add a host so the input and label are rendered
    await userEvent.click(screen.getByRole('button', { name: /add a host/i }))
    // Allowed Hosts field should be present
    expect(screen.getByLabelText('Allowed hosts')).toBeInTheDocument()
    // Add host button should be present
    expect(
      screen.getByRole('button', { name: /add a host/i })
    ).toBeInTheDocument()
  })

  it('allows adding, editing, and removing host entries', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
    const addHostButton = screen.getByRole('button', { name: /add a host/i })
    await userEvent.click(addHostButton)
    const hostInput = screen.getByLabelText('Host 1')
    // Invalid host
    await userEvent.type(hostInput, 'not a host')
    await userEvent.tab()
    // Submit the form to trigger validation
    await userEvent.click(
      screen.getByRole('button', { name: /install server/i })
    )
    expect(screen.getByText(/invalid host format/i)).toBeInTheDocument()
    // Valid host
    let hostInputRef = screen.queryByLabelText('Host 1')
    if (hostInputRef) {
      await userEvent.clear(hostInputRef)
      await userEvent.type(hostInputRef, 'google.com')
      await userEvent.tab()
      await userEvent.click(
        screen.getByRole('button', { name: /install server/i })
      )
      await waitFor(() => {
        expect(
          screen.queryByText(/invalid host format/i)
        ).not.toBeInTheDocument()
      })
    }
    // Valid host with dot
    hostInputRef = screen.queryByLabelText('Host 1')
    if (hostInputRef) {
      await userEvent.clear(hostInputRef)
      await userEvent.type(hostInputRef, '.example.com')
      await userEvent.tab()
      await userEvent.click(
        screen.getByRole('button', { name: /install server/i })
      )
      await waitFor(() => {
        expect(
          screen.queryByText(/invalid host format/i)
        ).not.toBeInTheDocument()
      })
    }
  })

  it('includes allowedHosts in the API payload when submitting the form', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
    const switchLabel = screen.getByLabelText(
      'Enable outbound network filtering'
    )
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
            name: 'my-network-server',
            allowedHosts: [{ value: 'foo.bar.com' }],
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
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
  it('skip allowedHosts and allowedPorts validation when network isolation is disabled', async () => {
    const mockInstallServerMutation = vi.fn()
    vi.mocked(useRunFromRegistry).mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.type(
      screen.getByLabelText('Server name'),
      'my-test-server',
      {
        initialSelectionStart: 0,
        initialSelectionEnd: REGISTRY_SERVER.name?.length,
      }
    )

    // Go to network isolation tab
    const networkTab = screen.getByRole('tab', { name: /network isolation/i })
    await userEvent.click(networkTab)

    const switchLabel = screen.getByLabelText(
      'Enable outbound network filtering'
    )
    await userEvent.click(switchLabel)

    const addHostButton = screen.getByRole('button', { name: /add a host/i })
    await userEvent.click(addHostButton)
    const hostInput = screen.getByLabelText('Host 1')
    await userEvent.type(hostInput, 'fake-invalid-host-format')

    const addPortButton = screen.getByRole('button', { name: /add a port/i })
    await userEvent.click(addPortButton)
    const portInput = screen.getByLabelText('Port 1')
    await userEvent.type(portInput, '99999')

    // Verify validation errors appear when network isolation is enabled
    await waitFor(() => {
      expect(screen.getByText('Invalid host format')).toBeInTheDocument()
      expect(
        screen.getByText('Port must be a number between 1 and 65535')
      ).toBeInTheDocument()
    })

    // Disable network isolation
    await userEvent.click(switchLabel)

    // Verify validation errors disappear when network isolation is disabled
    await waitFor(() => {
      expect(screen.queryByText('Invalid host format')).not.toBeInTheDocument()
      expect(
        screen.queryByText('Port must be a number between 1 and 65535')
      ).not.toBeInTheDocument()
    })

    // Go back to configuration tab and submit form
    const configTab = screen.getByRole('tab', { name: /configuration/i })
    await userEvent.click(configTab)

    // Form should submit successfully even with invalid host and port when network isolation is disabled
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            name: 'my-test-server',
            allowedHosts: [{ value: 'fake-invalid-host-format' }],
            allowedPorts: [{ value: '99999' }],
            networkIsolation: false,
          }),
        }),
        expect.any(Object)
      )
    })
  })
})

describe('Network Isolation Tab Activation', () => {
  it('activates the network isolation tab if a validation error occurs there while on the configuration tab', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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
    const switchLabel = screen.getByLabelText(
      'Enable outbound network filtering'
    )
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

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
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

describe('CommandArgumentsField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: vi.fn(),
      isErrorSecrets: false,
      isPendingSecrets: false,
    })
  })

  it('adds argument when pressing space key', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const commandArgsInput = screen.getByLabelText('Command arguments')
    await userEvent.type(commandArgsInput, '--verbose')
    await userEvent.keyboard(' ')

    expect(screen.getByText('--verbose')).toBeInTheDocument()
    expect(commandArgsInput).toHaveValue('')
  })

  it('adds argument when input loses focus on blur', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const commandArgsInput = screen.getByLabelText('Command arguments')
    await userEvent.type(commandArgsInput, '--port')
    await userEvent.tab()

    expect(screen.getByText('--port')).toBeInTheDocument()
    expect(commandArgsInput).toHaveValue('')
  })

  it('removes argument when clicking remove button', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const commandArgsInput = screen.getByLabelText('Command arguments')
    await userEvent.type(commandArgsInput, '--debug')
    await userEvent.keyboard('{Enter}')
    await userEvent.type(commandArgsInput, '--verbose')
    await userEvent.keyboard('{Enter}')

    expect(screen.getByText('--debug')).toBeInTheDocument()
    expect(screen.getByText('--verbose')).toBeInTheDocument()

    // Remove the first argument
    const removeButton = screen.getByLabelText('Remove argument --debug')
    await userEvent.click(removeButton)

    expect(screen.queryByText('--debug')).not.toBeInTheDocument()
    expect(screen.getByText('--verbose')).toBeInTheDocument()
  })

  it('disables remove button for default arguments', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL
    server.args = ['--stdio']

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(screen.getByText('--stdio')).toBeInTheDocument()

    const removeButton = screen.getByLabelText('Remove argument --stdio')
    expect(removeButton).toBeEnabled()
  })

  it('does not add empty arguments', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const commandArgsInput = screen.getByLabelText('Command arguments')
    await userEvent.type(commandArgsInput, '   ')
    await userEvent.keyboard('{Enter}')

    expect(screen.queryByLabelText(/Remove argument/)).not.toBeInTheDocument()
    expect(commandArgsInput).toHaveValue('')
  })

  it('paste arg from clipboard into command arguments field', async () => {
    const server = { ...REGISTRY_SERVER }
    server.env_vars = ENV_VARS_OPTIONAL

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={server}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    const commandArgsInput = screen.getByLabelText('Command arguments')
    await userEvent.click(commandArgsInput)
    await userEvent.paste('--toolsets repos,issues,pull_requests --read-only')
    expect(screen.getByText('--toolsets')).toBeVisible()
    expect(screen.getByText('repos,issues,pull_requests')).toBeVisible()
    expect(screen.getByText('--read-only')).toBeVisible()
    expect(commandArgsInput).toHaveValue('')
  })
})

describe('Storage Volumes', () => {
  it('configure storage volumes', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunFromRegistry.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={{ ...REGISTRY_SERVER }}
        actionsSubmitLabel="Install server"
      />
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
      screen.getByRole('textbox', {
        name: /host path 1/i,
      }),
      'host-path-volume'
    )
    await userEvent.type(
      screen.getByRole('textbox', {
        name: /container path 1/i,
      }),
      'container-path-volume'
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          server: expect.any(Object),
          data: expect.objectContaining({
            name: 'my-awesome-server',
            cmd_arguments: [],
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
            networkIsolation: false,
            allowedHosts: [],
            allowedPorts: [],
            volumes: [
              {
                accessMode: 'rw',
                container: 'container-path-volume',
                host: 'host-path-volume',
              },
            ],
          }),
        }),
        expect.any(Object)
      )
    })
  })

  it('shows a Select path menu with file and folder options', async () => {
    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={{ ...REGISTRY_SERVER }}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    const selectPath = screen.getByLabelText('Select path')
    await userEvent.click(selectPath)

    expect(
      screen.getByRole('menuitem', { name: /mount a single file/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /mount an entire folder/i })
    ).toBeInTheDocument()
  })

  it('fills Host path when selecting a single file from the picker', async () => {
    const originalElectronAPI = window.electronAPI
    const mockElectronAPI: typeof window.electronAPI = {
      ...originalElectronAPI,
      selectFile: vi.fn().mockResolvedValue('/tmp/example.txt'),
      selectFolder: vi.fn().mockResolvedValue(null),
    }
    window.electronAPI = mockElectronAPI

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={{ ...REGISTRY_SERVER }}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.click(screen.getByLabelText('Select path'))
    await userEvent.click(
      screen.getByRole('menuitem', { name: /mount a single file/i })
    )

    expect(screen.getByRole('textbox', { name: /host path 1/i })).toHaveValue(
      '/tmp/example.txt'
    )
    expect(mockElectronAPI.selectFile).toHaveBeenCalled()
    window.electronAPI = originalElectronAPI
  })

  it('fills Host path when selecting a folder from the picker', async () => {
    const originalElectronAPI = window.electronAPI
    const mockElectronAPI: typeof window.electronAPI = {
      ...originalElectronAPI,
      selectFile: vi.fn().mockResolvedValue(null),
      selectFolder: vi.fn().mockResolvedValue('/home/user/my-folder'),
    }
    window.electronAPI = mockElectronAPI

    renderWithProviders(
      <FormRunFromRegistry
        isOpen={true}
        onOpenChange={vi.fn()}
        server={{ ...REGISTRY_SERVER }}
        actionsSubmitLabel="Install server"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.click(screen.getByLabelText('Select path'))
    await userEvent.click(
      screen.getByRole('menuitem', { name: /mount an entire folder/i })
    )

    expect(screen.getByRole('textbox', { name: /host path 1/i })).toHaveValue(
      '/home/user/my-folder'
    )
    expect(mockElectronAPI.selectFolder).toHaveBeenCalled()
    window.electronAPI = originalElectronAPI
  })
})
