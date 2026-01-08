import { render, waitFor, screen } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import { DialogFormRemoteRegistryMcp } from '../dialog-form-remote-registry-mcp'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/common/components/ui/dialog'
import { server as mswServer } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'
import type { RegistryRemoteServerMetadata } from '@api/types.gen'
import { useRunRemoteServer } from '@/features/mcp-servers/hooks/use-run-remote-server'

// Mock the hooks
vi.mock('@/features/mcp-servers/hooks/use-run-remote-server', () => ({
  useRunRemoteServer: vi.fn(),
}))

vi.mock('@/common/hooks/use-check-server-status', () => ({
  useCheckServerStatus: vi.fn(),
}))

const mockUseCheckServerStatus = vi.mocked(useCheckServerStatus)
const mockUseRunRemoteServer = vi.mocked(useRunRemoteServer)

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

const mockServer: RegistryRemoteServerMetadata = {
  name: 'test-registry-server',
  description: 'Test registry server for MCP',
  transport: 'streamable-http',
  url: 'https://api.example.com/mcp',
  env_vars: [
    {
      name: 'DEBUG_MODE',
      description: 'Enable debug mode',
      required: false,
      secret: false,
      default: 'false',
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()

  // Setup MSW with default secrets
  mswServer.use(
    http.get(mswEndpoint('/api/v1beta/secrets/default/keys'), () => {
      return HttpResponse.json({
        keys: [{ key: 'SECRET_FROM_STORE' }, { key: 'GITHUB_TOKEN' }],
      })
    }),
    // Mock empty workloads by default
    http.get(mswEndpoint('/api/v1beta/workloads'), () => {
      return HttpResponse.json({ workloads: [] })
    })
  )

  // Default mock implementation
  mockUseRunRemoteServer.mockReturnValue({
    installServerMutation: vi.fn(),
    isErrorSecrets: false,
    isPendingSecrets: false,
  })

  mockUseCheckServerStatus.mockReturnValue({
    checkServerStatus: vi.fn(),
  })
})

describe('DialogFormRemoteRegistryMcp', () => {
  it('renders the dialog with server information and form fields', async () => {
    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteRegistryMcp
          server={mockServer}
          isOpen
          closeDialog={vi.fn()}
          actionsSubmitLabel="Install server"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Check dialog title
    expect(
      screen.getByText('Add test-registry-server remote MCP server')
    ).toBeInTheDocument()

    // Check form fields are present
    expect(
      screen.getByRole('textbox', { name: /server name/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: /server url/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Transport')).toBeInTheDocument()
    expect(screen.getByLabelText('Authorization method')).toBeInTheDocument()

    // Check pre-filled values
    expect(screen.getByDisplayValue('test-registry-server')).toBeInTheDocument()
  })

  it('validates required fields and shows errors', async () => {
    const user = userEvent.setup({ delay: null })
    const mockInstallServerMutation = vi.fn()
    mockUseRunRemoteServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteRegistryMcp
          server={mockServer}
          isOpen
          closeDialog={vi.fn()}
          actionsSubmitLabel="Install server"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Clear the server name field to trigger validation
    const nameInput = screen.getByRole('textbox', { name: /server name/i })
    await user.clear(nameInput)

    // Try to submit without filling required fields
    await user.click(screen.getByRole('button', { name: 'Install server' }))

    await waitFor(() => {
      expect(mockInstallServerMutation).not.toHaveBeenCalled()
    })

    // Check that validation errors are shown
    await waitFor(() => {
      expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('renders form with pre-filled server data and calls mutation on install', async () => {
    const user = userEvent.setup({ delay: null })
    const mockInstallServerMutation = vi.fn()

    mockUseCheckServerStatus.mockReturnValue({
      checkServerStatus: vi.fn(),
    })

    mockUseRunRemoteServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: true,
      isPendingSecrets: true,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteRegistryMcp
          server={mockServer}
          isOpen
          closeDialog={vi.fn()}
          actionsSubmitLabel="Install server"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    expect(screen.getByDisplayValue('test-registry-server')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('https://api.example.com/mcp')
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('combobox', {
        name: /authorization method/i,
      })
    )

    await user.click(
      screen.getByRole('option', {
        name: 'OAuth 2.0',
      })
    )

    await user.type(screen.getByLabelText('Callback port'), '8888')

    await user.type(
      screen.getByRole('textbox', {
        name: /authorize url/i,
      }),
      'https://api.example.com/authorize'
    )

    await user.type(
      screen.getByRole('textbox', {
        name: /token url/i,
      }),
      'https://api.example.com/token'
    )

    await user.type(
      screen.getByRole('textbox', {
        name: /client id/i,
      }),
      'client_id'
    )

    await user.click(
      screen.getByRole('combobox', {
        name: /use a secret from the store/i,
      })
    )

    await user.click(
      screen.getByRole('option', {
        name: /secret_from_store/i,
      })
    )

    const submitButton = screen.getByRole('button', { name: 'Install server' })
    expect(submitButton).toBeEnabled()

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        {
          data: {
            auth_type: 'oauth2',
            group: 'default',
            name: 'test-registry-server',
            oauth_config: {
              authorize_url: 'https://api.example.com/authorize',
              callback_port: 8888,
              client_id: 'client_id',
              client_secret: {
                name: 'OAUTH_CLIENT_SECRET_TEST-REGISTRY-SERVER',
                value: {
                  isFromStore: true,
                  secret: 'SECRET_FROM_STORE',
                },
              },
              issuer: '',
              oauth_params: undefined,
              scopes: '',
              skip_browser: false,
              token_url: 'https://api.example.com/token',
              use_pkce: true,
            },
            secrets: [],
            transport: 'streamable-http',
            url: 'https://api.example.com/mcp',
          },
        },
        expect.any(Object)
      )
    })
  })

  it('displays OAuth2 fields when OAuth2 is selected', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteRegistryMcp
          server={mockServer}
          isOpen
          closeDialog={vi.fn()}
          actionsSubmitLabel="Install server"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Select OAuth2 authentication
    await user.click(screen.getByLabelText('Authorization method'))
    await user.click(screen.getByRole('option', { name: 'OAuth 2.0' }))

    // OAuth2 fields should now be visible
    await waitFor(() => {
      expect(screen.getByLabelText('Callback port')).toBeInTheDocument()
    })
  })

  it('can cancel and close dialog', async () => {
    const user = userEvent.setup({ delay: null })
    const mockCloseDialog = vi.fn()

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteRegistryMcp
          server={mockServer}
          isOpen
          closeDialog={mockCloseDialog}
          actionsSubmitLabel="Install server"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockCloseDialog).toHaveBeenCalled()
  })

  it('hides secrets fields for OAuth2 auth type', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteRegistryMcp
          server={mockServer}
          isOpen
          closeDialog={vi.fn()}
          actionsSubmitLabel="Install server"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Select OAuth2 authentication
    await user.click(screen.getByLabelText('Authorization method'))
    await user.click(screen.getByRole('option', { name: 'OAuth 2.0' }))

    // Secrets section should be hidden for OAuth2
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Add secret' })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Add environment variable' })
      ).not.toBeInTheDocument()
    })
  })

  it('displays group selector', async () => {
    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/groups'), () => {
        return HttpResponse.json({
          groups: [
            { name: 'default' },
            { name: 'production' },
            { name: 'staging' },
          ],
        })
      })
    )

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteRegistryMcp
          server={mockServer}
          isOpen
          closeDialog={vi.fn()}
          actionsSubmitLabel="Install server"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await waitFor(
      () => {
        expect(screen.getByLabelText('Group')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })
})
