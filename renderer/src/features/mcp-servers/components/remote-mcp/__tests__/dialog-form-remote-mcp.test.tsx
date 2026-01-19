import { render, waitFor, screen } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import { DialogFormRemoteMcp } from '../dialog-form-remote-mcp'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/common/components/ui/dialog'
import { recordRequests } from '@/common/mocks/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mockedGetApiV1BetaGroups } from '@/common/mocks/fixtures/groups/get'
import { mockedPostApiV1BetaWorkloads } from '@/common/mocks/fixtures/workloads/post'
import { mockedGetApiV1BetaWorkloadsByName } from '@/common/mocks/fixtures/workloads_name/get'
import { mockedPostApiV1BetaWorkloadsByNameEdit } from '@/common/mocks/fixtures/workloads_name_edit/post'
import { mockedGetApiV1BetaSecretsDefaultKeys } from '@/common/mocks/fixtures/secrets_default_keys/get'
import { mockedPostApiV1BetaSecretsDefaultKeys } from '@/common/mocks/fixtures/secrets_default_keys/post'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'

vi.mock('@/common/hooks/use-check-server-status', () => ({
  useCheckServerStatus: vi.fn(),
}))

// Mock router hooks to avoid RouterProvider dependency
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useLocation: () => ({ pathname: '/' }),
  }
})

const mockUseCheckServerStatus = vi.mocked(useCheckServerStatus)

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

  mockedGetApiV1BetaGroups.override((data) => ({
    ...data,
    groups: [{ name: 'default', registered_clients: [] }],
  }))

  mockedPostApiV1BetaWorkloads.override(() => ({
    name: 'test-server',
    port: 0,
  }))

  mockedGetApiV1BetaSecretsDefaultKeys.override(() => ({
    keys: [{ key: 'SECRET_FROM_STORE' }],
  }))

  mockedPostApiV1BetaSecretsDefaultKeys.override(() => ({
    key: 'SECRET_FROM_STORE',
  }))

  mockUseCheckServerStatus.mockReturnValue({
    checkServerStatus: vi.fn(),
  })
})

describe('DialogFormRemoteMcp', () => {
  it('validates required fields and shows errors', async () => {
    const user = userEvent.setup({ delay: null })

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: 'Install server' }))

    await waitFor(() => {
      expect(
        screen.getByRole('textbox', {
          name: /server name/i,
        })
      ).toHaveAttribute('aria-invalid', 'true')
      expect(
        screen.getByRole('textbox', {
          name: /server url/i,
        })
      ).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText('Callback port')).toHaveAttribute(
        'aria-invalid',
        'true'
      )
    })
  })

  it('shows loading state when submitting', async () => {
    const user = userEvent.setup({ delay: null })

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await user.type(
      screen.getByRole('textbox', { name: /server name/i }),
      'test-server'
    )
    await user.click(screen.getByLabelText('Transport'))
    await user.click(
      screen.getByRole('option', {
        name: /streamable http/i,
      })
    )
    await user.type(
      screen.getByRole('textbox', {
        name: /server url/i,
      }),
      'https://api.example.com/mcp'
    )
    await user.type(screen.getByLabelText('Callback port'), '8888')

    await user.click(screen.getByRole('button', { name: 'Install server' }))

    await waitFor(() => {
      expect(
        screen.getByText(/installing server|creating secrets/i)
      ).toBeInTheDocument()
    })
  })

  it('submit remote mcp', async () => {
    const user = userEvent.setup({ delay: null })
    const mockCheckServerStatus = vi.fn()
    const mockOnOpenChange = vi.fn()
    const rec = recordRequests()

    mockUseCheckServerStatus.mockReturnValue({
      checkServerStatus: mockCheckServerStatus,
    })

    mockedPostApiV1BetaWorkloads.override(() => ({
      name: 'test-remote-server',
      port: 0,
    }))

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp
          isOpen
          closeDialog={mockOnOpenChange}
          groupName="default"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await user.type(
      screen.getByRole('textbox', {
        name: /name/i,
      }),
      'test-remote-server'
    )

    await user.type(
      screen.getByRole('textbox', {
        name: /server url/i,
      }),
      'https://api.example.com/mcp'
    )

    expect(screen.getByLabelText('Authorization method')).toBeVisible()

    await user.type(screen.getByLabelText('Callback port'), '8888')
    await user.click(screen.getByRole('button', { name: 'Install server' }))

    await waitFor(() => {
      const workloadCall = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
      )
      expect(workloadCall).toBeDefined()
      expect(workloadCall?.payload).toEqual(
        expect.objectContaining({
          url: 'https://api.example.com/mcp',
          name: 'test-remote-server',
          oauth_config: expect.objectContaining({
            authorize_url: '',
            callback_port: 8888,
            client_id: '',
            issuer: '',
            oauth_params: {},
            scopes: [],
            skip_browser: false,
            token_url: '',
            use_pkce: true,
          }),
          transport: 'streamable-http',
          group: 'default',
        })
      )
    })

    await waitFor(() => {
      expect(mockCheckServerStatus).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalled()
    })
  })

  it.each([
    ['Dynamic Client Registration', 'none'],
    ['OIDC', 'oidc'],
  ])(
    'submits Issuer URL when auth type is %s',
    async (authOptionLabel, expectedAuthType) => {
      const user = userEvent.setup({ delay: null })
      const rec = recordRequests()

      mockedPostApiV1BetaWorkloads.override(() => ({
        name: 'issuer-enabled-server',
        port: 0,
      }))

      renderWithProviders(
        <Wrapper>
          <DialogFormRemoteMcp
            isOpen
            closeDialog={vi.fn()}
            groupName="default"
          />
        </Wrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible()
      })

      await user.type(
        screen.getByRole('textbox', {
          name: /server name/i,
        }),
        'issuer-enabled-server'
      )

      await user.type(
        screen.getByRole('textbox', {
          name: /server url/i,
        }),
        'https://api.example.com/mcp'
      )

      await user.type(screen.getByLabelText('Callback port'), '7777')

      await user.click(screen.getByLabelText('Authorization method'))
      await user.click(
        screen.getByRole('option', {
          name: authOptionLabel,
        })
      )

      const issuerValue =
        expectedAuthType === 'none'
          ? 'https://issuer.example.com/none'
          : 'https://issuer.example.com/oidc'

      const issuerInput = screen.getByPlaceholderText(
        'e.g. https://auth.example.com/'
      )
      await user.clear(issuerInput)
      await user.type(issuerInput, issuerValue)

      if (expectedAuthType === 'oidc') {
        const clientIdInput = screen.getByPlaceholderText(
          'e.g. 00000000-0000-0000-0000-000000000000'
        )
        await user.clear(clientIdInput)
        await user.type(clientIdInput, 'oidc-client-id')
      }

      await user.click(screen.getByRole('button', { name: 'Install server' }))

      await waitFor(() => {
        const workloadCall = rec.recordedRequests.find(
          (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
        )
        expect(workloadCall).toBeDefined()
        expect(workloadCall?.payload).toEqual(
          expect.objectContaining({
            name: 'issuer-enabled-server',
            url: 'https://api.example.com/mcp',
            transport: 'streamable-http',
            group: 'default',
            oauth_config: expect.objectContaining({
              issuer: issuerValue,
              callback_port: 7777,
              scopes: [],
            }),
          })
        )

        if (expectedAuthType === 'oidc') {
          expect(
            (workloadCall?.payload as { oauth_config: { client_id: string } })
              .oauth_config
          ).toHaveProperty('client_id', 'oidc-client-id')
        }
      })
    }
  )

  it('can cancel and close dialog', async () => {
    const user = userEvent.setup({ delay: null })
    const mockOnOpenChange = vi.fn()

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp
          isOpen
          closeDialog={mockOnOpenChange}
          groupName="default"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockOnOpenChange).toHaveBeenCalled()
  })

  it('updates an existing remote server', async () => {
    const user = userEvent.setup({ delay: null })
    const rec = recordRequests()

    mockedGetApiV1BetaWorkloadsByName.override((data) => ({
      ...data,
      name: 'existing-server',
      url: 'https://old-api.example.com',
      transport: 'streamable-http',
      oauth_config: {
        callback_port: 8080,
        authorize_url: '',
        token_url: '',
        client_id: '',
        issuer: '',
        scopes: [],
        skip_browser: false,
        use_pkce: true,
        oauth_params: {},
      },
      group: 'default',
    }))

    mockedPostApiV1BetaWorkloadsByNameEdit.override(() => ({
      name: 'existing-server',
      port: 0,
    }))

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp
          isOpen
          closeDialog={vi.fn()}
          groupName="default"
          serverToEdit="existing-server"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /server url/i })).toHaveValue(
        'https://old-api.example.com'
      )
    })

    const urlInput = screen.getByRole('textbox', { name: /server url/i })
    await user.clear(urlInput)
    await user.type(urlInput, 'https://new-api.example.com')

    await user.click(screen.getByRole('button', { name: /update server/i }))

    await waitFor(() => {
      const editCall = rec.recordedRequests.find(
        (r) =>
          r.method === 'POST' &&
          r.pathname.includes('/workloads/') &&
          r.pathname.includes('/edit')
      )
      expect(editCall).toBeDefined()
      expect(editCall?.payload).toEqual(
        expect.objectContaining({
          name: 'existing-server',
          url: 'https://new-api.example.com',
          transport: 'streamable-http',
        })
      )
    })
  })

  it('submits bearer token auth with correct oauth_config', async () => {
    const user = userEvent.setup({ delay: null })
    const rec = recordRequests()

    mockedPostApiV1BetaWorkloads.override(() => ({
      name: 'bearer-auth-server',
      port: 0,
    }))

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await user.type(
      screen.getByRole('textbox', { name: /server name/i }),
      'bearer-auth-server'
    )

    await user.type(
      screen.getByRole('textbox', { name: /server url/i }),
      'https://api.example.com/mcp'
    )

    // Select Bearer Token auth type
    await user.click(screen.getByLabelText('Authorization method'))
    await user.click(screen.getByRole('option', { name: 'Bearer Token' }))

    // Wait for bearer token field and fill it
    const bearerTokenInput = await screen.findByPlaceholderText(
      'e.g. token_123_ABC_789_XYZ'
    )
    await user.type(bearerTokenInput, 'my-secret-bearer-token')

    const bearerTokenStoreName = 'SECRET_FROM_STORE'

    await user.click(screen.getByRole('button', { name: 'Install server' }))

    await waitFor(() => {
      const workloadCall = rec.recordedRequests.find(
        (r) => r.method === 'POST' && r.pathname === '/api/v1beta/workloads'
      )
      expect(workloadCall).toBeDefined()
      expect(workloadCall?.payload).toEqual(
        expect.objectContaining({
          name: 'bearer-auth-server',
          url: 'https://api.example.com/mcp',
          transport: 'streamable-http',
          group: 'default',
          oauth_config: expect.objectContaining({
            bearer_token: {
              name: bearerTokenStoreName,
              target: bearerTokenStoreName,
            },
          }),
        })
      )
      // client_secret should be undefined for bearer auth
      expect(
        (workloadCall?.payload as { oauth_config: { client_secret?: unknown } })
          .oauth_config.client_secret
      ).toBeUndefined()
    })
  })

  it('resets secret key name to default when user types a new value after selecting from store', async () => {
    const user = userEvent.setup({ delay: null })

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await user.type(
      screen.getByRole('textbox', { name: /server name/i }),
      'my-test-server'
    )
    await user.type(
      screen.getByRole('textbox', { name: /server url/i }),
      'https://api.example.com'
    )

    // Select OAuth2 auth type
    await user.click(screen.getByLabelText('Authorization method'))
    await user.click(screen.getByRole('option', { name: 'OAuth 2.0' }))

    // Wait for OAuth fields to appear and verify default secret name
    const secretNameInput =
      await screen.findByPlaceholderText('e.g. CLIENT_SECRET')
    expect(secretNameInput).toHaveValue('OAUTH_CLIENT_SECRET_MY_TEST_SERVER')

    // Select a secret from the store
    await user.click(
      screen.getByRole('combobox', { name: /use a secret from the store/i })
    )
    await user.click(screen.getByRole('option', { name: /secret_from_store/i }))

    // Verify secret name changed to the selected one
    await waitFor(() => {
      expect(secretNameInput).toHaveValue('SECRET_FROM_STORE')
    })

    // Now type a new value in the Value input
    const valueInput = screen.getByPlaceholderText(
      'e.g. secret_123_ABC_789_XYZ'
    )
    await user.type(valueInput, 'my-new-secret-value')

    // Verify secret name is reset to the default
    await waitFor(() => {
      expect(secretNameInput).toHaveValue('OAUTH_CLIENT_SECRET_MY_TEST_SERVER')
    })
  })
})
