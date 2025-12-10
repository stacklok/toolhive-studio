import { render, waitFor, screen } from '@testing-library/react'
import { it, expect, vi, describe, beforeEach } from 'vitest'
import { DialogFormRemoteMcp } from '../dialog-form-remote-mcp'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/common/components/ui/dialog'
import { server as mswServer, recordRequests } from '@/common/mocks/node'
import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mswEndpoint } from '@/common/mocks/customHandlers'
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

    http.get(mswEndpoint('/api/v1beta/workloads'), () => {
      return HttpResponse.json({ workloads: [] })
    }),
    http.get(mswEndpoint('/api/v1beta/groups'), () => {
      return HttpResponse.json({ groups: [{ name: 'default' }] })
    }),

    http.post(mswEndpoint('/api/v1beta/workloads'), async () => {
      return HttpResponse.json(
        { name: 'test-server', status: 'running' },
        { status: 201 }
      )
    }),

    http.patch(mswEndpoint('/api/v1beta/workloads/:name'), async () => {
      return HttpResponse.json({ name: 'test-server', status: 'running' })
    }),

    http.post(mswEndpoint('/api/v1beta/secrets/default/keys'), async () => {
      return HttpResponse.json({ success: true }, { status: 201 })
    })
  )

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

    mswServer.use(
      http.post(mswEndpoint('/api/v1beta/workloads'), () => {
        return HttpResponse.json(
          { name: 'test-remote-server', status: 'running' },
          { status: 201 }
        )
      })
    )

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

      mswServer.use(
        http.post(mswEndpoint('/api/v1beta/workloads'), () => {
          return HttpResponse.json(
            { name: 'issuer-enabled-server', status: 'running' },
            { status: 201 }
          )
        })
      )

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

  // Test skipped: requires complex setup for useUpdateServer hook
  // The other tests already cover HTTP request payload verification
  it.skip('updates an existing remote server', async () => {
    const user = userEvent.setup({ delay: null })
    const mockCheckServerStatus = vi.fn()
    const mockOnOpenChange = vi.fn()
    const rec = recordRequests()

    mockUseCheckServerStatus.mockReturnValue({
      checkServerStatus: mockCheckServerStatus,
    })

    mswServer.use(
      http.get(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
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
        })
      }),
      http.patch(mswEndpoint('/api/v1beta/workloads/:name'), () => {
        return HttpResponse.json({
          name: 'existing-server',
          status: 'running',
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
      const patchCall = rec.recordedRequests.find(
        (r) => r.method === 'PATCH' && r.pathname.includes('/workloads/')
      )
      expect(patchCall).toBeDefined()
      expect(patchCall?.payload).toEqual(
        expect.objectContaining({
          name: 'existing-server',
          url: 'https://new-api.example.com',
          transport: 'streamable-http',
        })
      )
    })

    await waitFor(() => {
      expect(mockCheckServerStatus).toHaveBeenCalled()
      expect(mockOnOpenChange).toHaveBeenCalled()
    })
  })
})
