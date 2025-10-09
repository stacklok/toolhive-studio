import { render, waitFor, screen, act } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import { DialogFormRemoteMcp } from '../dialog-form-remote-mcp'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/common/components/ui/dialog'
import { server as mswServer } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRunRemoteServer } from '../../../hooks/use-run-remote-server'
import { useUpdateServer } from '../../../hooks/use-update-server'
import { mswEndpoint } from '@/common/mocks/customHandlers'
import { useCheckServerStatus } from '@/common/hooks/use-check-server-status'

// Mock the hooks
vi.mock('../../../hooks/use-run-remote-server', () => ({
  useRunRemoteServer: vi.fn(),
}))

vi.mock('../../../hooks/use-update-server', () => ({
  useUpdateServer: vi.fn(),
}))

vi.mock('@/common/hooks/use-check-server-status', () => ({
  useCheckServerStatus: vi.fn(),
}))

const mockUseCheckServerStatus = vi.mocked(useCheckServerStatus)
const mockUseRunRemoteServer = vi.mocked(useRunRemoteServer)
const mockUseUpdateServer = vi.mocked(useUpdateServer)

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
    }),
    http.get(mswEndpoint('/api/v1beta/groups'), () => {
      return HttpResponse.json({ groups: [{ name: 'default' }] })
    })
  )

  // Default mock implementation
  mockUseRunRemoteServer.mockReturnValue({
    installServerMutation: vi.fn(),
    isErrorSecrets: false,
    isPendingSecrets: false,
  })

  mockUseUpdateServer.mockReturnValue({
    updateServerMutation: vi.fn(),
    isPendingSecrets: false,
    isErrorSecrets: false,
  })

  mockUseCheckServerStatus.mockReturnValue({
    checkServerStatus: vi.fn(),
  })
})

describe('DialogFormRemoteMcp', () => {
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
        <DialogFormRemoteMcp isOpen closeDialog={vi.fn()} groupName="default" />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Try to submit without filling required fields
    await user.click(screen.getByRole('button', { name: 'Install server' }))

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
    const user = userEvent.setup({ delay: null })
    const mockInstallServerMutation = vi.fn()
    mockUseRunRemoteServer.mockReturnValue({
      installServerMutation: mockInstallServerMutation,
      isErrorSecrets: false,
      isPendingSecrets: false,
    })

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

    // The loading state should be shown
    await waitFor(() => {
      expect(
        screen.getByText(/installing server|creating secrets/i)
      ).toBeInTheDocument()
    })
  })

  it('submit remote mcp', async () => {
    const user = userEvent.setup({ delay: null })
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
    // Fill required fields
    await user.type(
      screen.getByRole('textbox', {
        name: /name/i,
      }),
      'test-remote-server'
    )

    await user.type(
      screen.getByRole('textbox', {
        name: /url/i,
      }),
      'https://api.example.com/mcp'
    )

    expect(screen.getByLabelText('Authorization method')).toBeVisible()

    await user.type(screen.getByLabelText('Callback port'), '8888')
    await user.click(screen.getByRole('button', { name: 'Install server' }))
    await waitFor(() => {
      expect(mockInstallServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            url: 'https://api.example.com/mcp',
            auth_type: 'none',
            name: 'test-remote-server',
            oauth_config: {
              authorize_url: '',
              callback_port: 8888,
              client_id: '',
              client_secret: undefined,
              issuer: '',
              oauth_params: {},
              scopes: '',
              skip_browser: false,
              token_url: '',
              use_pkce: true,
            },
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
    const mockUpdateServerMutation = vi.fn()
    const mockCheckServerStatus = vi.fn()
    const mockOnOpenChange = vi.fn()

    mockUseCheckServerStatus.mockReturnValue({
      checkServerStatus: mockCheckServerStatus,
    })

    mockUseUpdateServer.mockReturnValue({
      updateServerMutation: mockUpdateServerMutation,
      isPendingSecrets: false,
      isErrorSecrets: false,
    })

    // Mock the existing server data
    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          name: 'existing-server',
          url: 'https://old-api.example.com',
          transport: 'streamable-http',
          auth_type: 'none',
          oauth_config: {
            callback_port: 8080,
          },
          group: 'default',
        })
      })
    )

    renderWithProviders(
      <Wrapper>
        <DialogFormRemoteMcp
          isOpen
          closeDialog={mockOnOpenChange}
          groupName="default"
          serverToEdit="existing-server"
        />
      </Wrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeVisible()
    })

    // Wait for form to load with existing data
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /url/i })).toHaveValue(
        'https://old-api.example.com'
      )
    })

    // Update the URL
    const urlInput = screen.getByRole('textbox', { name: /url/i })
    await user.clear(urlInput)
    await user.type(urlInput, 'https://new-api.example.com')

    // Submit the form
    await user.click(screen.getByRole('button', { name: /update server/i }))

    await waitFor(() => {
      expect(mockUpdateServerMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'existing-server',
            url: 'https://new-api.example.com',
            transport: 'streamable-http',
          }),
        }),
        expect.any(Object)
      )
    })

    // Simulate successful submission
    const onSuccessCallback =
      mockUpdateServerMutation.mock.calls[0]?.[1]?.onSuccess

    await act(async () => {
      onSuccessCallback?.()
    })

    await waitFor(() => {
      expect(mockCheckServerStatus).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalled()
    })
  })
})
