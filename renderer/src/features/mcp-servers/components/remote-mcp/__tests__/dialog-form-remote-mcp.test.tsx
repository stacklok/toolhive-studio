import { render, waitFor, screen, act } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import { DialogFormRemoteMcp } from '../dialog-form-remote-mcp'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/common/components/ui/dialog'
import { server as mswServer } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRunRemoteServer } from '../../../hooks/use-run-remote-server'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'

// Mock the hook
vi.mock('../../../hooks/use-run-remote-server', () => ({
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
  mockUseRunRemoteServer.mockReturnValue({
    installServerMutation: vi.fn(),
    isErrorSecrets: false,
    isPendingSecrets: false,
  })

  mockUseCheckServerStatus.mockReturnValue({
    checkServerStatus: vi.fn(),
  })
})

describe('DialogFormRemoteMcp', () => {
  it('handles secrets correctly - both inline and from store', async () => {
    const mockInstallServerMutation = vi.fn()
    mockUseRunRemoteServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp isOpen closeDialog={vi.fn()} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill basic fields
    await userEvent.type(
      screen.getByRole('textbox', { name: /server name/i }),
      'secret-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(
      screen.getByRole('option', { name: /streamable http/i })
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

    await userEvent.type(
      screen.getByRole('textbox', {
        name: /server url/i,
      }),
      'https://api.example.com/mcp'
    )
    await userEvent.type(screen.getByLabelText('Callback port'), '8888')

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
    mockUseRunRemoteServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp isOpen closeDialog={vi.fn()} />
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
    const mockInstallServerMutation = vi.fn()
    mockUseRunRemoteServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp isOpen closeDialog={vi.fn()} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Fill required fields
    await userEvent.type(
      screen.getByRole('textbox', { name: /server name/i }),
      'test-server'
    )
    await userEvent.click(screen.getByLabelText('Transport'))
    await userEvent.click(
      screen.getByRole('option', {
        name: /streamable http/i,
      })
    )
    await userEvent.type(
      screen.getByRole('textbox', {
        name: /server url/i,
      }),
      'https://api.example.com/mcp'
    )
    await userEvent.type(screen.getByLabelText('Callback port'), '8888')

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

  it('submit remote mcp', async () => {
    const mockInstallServerMutation = vi.fn()
    const mockCheckServerStatus = vi.fn()
    const mockOnOpenChange = vi.fn()

    mockUseCheckServerStatus.mockReturnValue({
      checkServerStatus: mockCheckServerStatus,
    })

    mockUseRunRemoteServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp isOpen closeDialog={mockOnOpenChange} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })
    // Fill required fields
    await userEvent.type(
      screen.getByRole('textbox', {
        name: /name/i,
      }),
      'test-remote-server'
    )

    await userEvent.type(
      screen.getByRole('textbox', {
        name: /url/i,
      }),
      'https://api.example.com/mcp'
    )

    expect(screen.getByLabelText('Authorization method')).toBeVisible()

    await userEvent.type(screen.getByLabelText('Callback port'), '8888')
    await userEvent.click(
      screen.getByRole('button', { name: 'Install server' })
    )
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            envVars: [],
            url: 'https://api.example.com/mcp',
            auth_type: 'none',
            name: 'test-remote-server',
            oauth_config: {
              authorize_url: '',
              callback_port: 8888,
              client_id: '',
              client_secret: '',
              issuer: '',
              oauth_params: {},
              scopes: '',
              skip_browser: false,
              token_url: '',
              use_pkce: true,
            },
            secrets: [],
            transport: 'streamable-http',
          }),
        }),
        expect.any(Object)
      )
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
        <DialogFormRemoteMcp isOpen closeDialog={mockOnOpenChange} />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockOnOpenChange).toHaveBeenCalled()
  })
})
