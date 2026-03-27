import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RegistryTab } from '../../registry/registry-tab'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { HttpResponse } from 'msw'
import { recordRequests } from '@/common/mocks/node'
import { toast } from 'sonner'
import { mockedPutApiV1BetaRegistryByName } from '@/common/mocks/fixtures/registry_name/put'
import { mockedGetApiV1BetaRegistry } from '@/common/mocks/fixtures/registry/get'
import { mockedPostApiV1BetaRegistryAuthLogin } from '@/common/mocks/fixtures/registry_auth_login/post'
import {
  REGISTRY_WRONG_AUTH_TOAST,
  REGISTRY_AUTH_REQUIRED_UI_MESSAGE,
} from '../../registry/registry-errors'

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return {
    ...render(
      <PromptProvider>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </PromptProvider>
    ),
    queryClient,
  }
}

Object.defineProperty(Element.prototype, 'hasPointerCapture', {
  value: vi.fn().mockReturnValue(false),
  writable: true,
})

Object.defineProperty(Element.prototype, 'setPointerCapture', {
  value: vi.fn(),
  writable: true,
})

describe('RegistryTab', () => {
  it('renders registry settings with default state', async () => {
    renderWithProviders(<RegistryTab />)

    expect(screen.getByText('Registry')).toBeVisible()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })
  })

  it('handles remote registry configuration with valid URL', async () => {
    const rec = recordRequests()
    const url = 'https://domain.com/registry.json'

    mockedPutApiV1BetaRegistryByName.override(() => ({
      message: 'Registry updated successfully',
      type: 'remote',
    }))

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    const selectTrigger = screen.getByRole('combobox')
    await userEvent.click(selectTrigger)

    const remoteOptions = screen.getByRole('option', {
      name: 'Remote Registry (JSON URL)',
    })
    expect(remoteOptions).toBeVisible()

    await userEvent.click(remoteOptions)
    await waitFor(() => {
      expect(screen.getByText('Registry URL')).toBeVisible()
    })

    const urlInput = screen.getByLabelText(/Registry URL/i)
    await userEvent.type(urlInput, url)

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    await waitFor(() => {
      const putRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'PUT' &&
          req.pathname === '/api/v1beta/registry/default'
      )
      expect(putRequests).toHaveLength(1)
      expect(putRequests[0]?.payload).toEqual({ url })
    })
  })

  it('shows validation error for URL without .json extension', async () => {
    const rec = recordRequests()

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    const selectTrigger = screen.getByRole('combobox')
    await userEvent.click(selectTrigger)

    const remoteOptions = screen.getByRole('option', {
      name: 'Remote Registry (JSON URL)',
    })
    await userEvent.click(remoteOptions)

    await waitFor(() => {
      expect(screen.getByText('Registry URL')).toBeVisible()
    })

    const urlInput = screen.getByLabelText(/Registry URL/i)
    await userEvent.type(urlInput, 'https://domain.com/registry')

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Registry must be a .json file')).toBeVisible()
    })

    const putRequests = rec.recordedRequests.filter(
      (req) =>
        req.method === 'PUT' && req.pathname === '/api/v1beta/registry/default'
    )
    expect(putRequests).toHaveLength(0)
  })

  it('shows validation error for URL without https prefix', async () => {
    const rec = recordRequests()

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    const selectTrigger = screen.getByRole('combobox')
    await userEvent.click(selectTrigger)

    const remoteOptions = screen.getByRole('option', {
      name: 'Remote Registry (JSON URL)',
    })
    await userEvent.click(remoteOptions)

    await waitFor(() => {
      expect(screen.getByText('Registry URL')).toBeVisible()
    })

    const urlInput = screen.getByLabelText(/Registry URL/i)
    await userEvent.type(urlInput, 'http://domain.com/registry.json')

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText('Remote registry must be a valid HTTPS URL')
      ).toBeVisible()
    })

    const putRequests = rec.recordedRequests.filter(
      (req) =>
        req.method === 'PUT' && req.pathname === '/api/v1beta/registry/default'
    )
    expect(putRequests).toHaveLength(0)
  })

  it('handles local registry configuration', async () => {
    const rec = recordRequests()

    mockedPutApiV1BetaRegistryByName.override(() => ({
      message: 'Registry updated successfully',
      type: 'local',
    }))

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByText('Registry')).toBeVisible()
    })
    const selectTrigger = screen.getByRole('combobox')
    await userEvent.click(selectTrigger)

    const localOptions = screen.getByRole('option', {
      name: 'Local Registry (JSON File Path)',
    })
    expect(localOptions).toBeVisible()

    await userEvent.click(
      screen.getByRole('option', {
        name: 'Local Registry (JSON File Path)',
      })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry File Path/i)).toBeVisible()
    })

    const pathInput = screen.getByLabelText(/Registry File Path/i)
    await userEvent.type(pathInput, '/path/to/local/registry.json')

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    await waitFor(() => {
      const putRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'PUT' &&
          req.pathname === '/api/v1beta/registry/default'
      )
      expect(putRequests.length).toBeGreaterThanOrEqual(1)
      const lastRequest = putRequests[putRequests.length - 1]
      expect(lastRequest?.payload).toEqual({
        local_path: '/path/to/local/registry.json',
      })
    })

    await userEvent.click(screen.getByRole('combobox'))
    const defaultOptions = screen.getByRole('option', {
      name: 'Default Registry',
    })
    expect(defaultOptions).toBeVisible()
    await userEvent.click(defaultOptions)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const putRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'PUT' &&
          req.pathname === '/api/v1beta/registry/default'
      )
      const lastRequest = putRequests[putRequests.length - 1]
      expect(lastRequest?.payload).toEqual({})
    })
  })

  it('shows validation error for local path without .json extension', async () => {
    const rec = recordRequests()

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByText('Registry')).toBeVisible()
    })

    const selectTrigger = screen.getByRole('combobox')
    await userEvent.click(selectTrigger)

    const localOptions = screen.getByRole('option', {
      name: 'Local Registry (JSON File Path)',
    })
    await userEvent.click(localOptions)

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry File Path/i)).toBeVisible()
    })

    const pathInput = screen.getByLabelText(/Registry File Path/i)
    await userEvent.type(pathInput, '/path/to/registry.txt')

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Registry must be a .json file')).toBeVisible()
    })

    const putRequests = rec.recordedRequests.filter(
      (req) =>
        req.method === 'PUT' && req.pathname === '/api/v1beta/registry/default'
    )
    expect(putRequests).toHaveLength(0)
  })

  it('opens native file picker for local registry and fills the path', async () => {
    const originalElectronAPI = window.electronAPI
    const mockElectronAPI: typeof window.electronAPI = {
      ...originalElectronAPI,
      selectFile: vi.fn().mockResolvedValue('/home/user/registry.json'),
      selectFolder: vi.fn().mockResolvedValue(null),
    }
    window.electronAPI = mockElectronAPI

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', {
        name: 'Local Registry (JSON File Path)',
      })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry File Path/i)).toBeVisible()
    })

    await userEvent.click(screen.getByLabelText('Select path'))

    await waitFor(() => {
      expect(
        screen.getByRole('textbox', { name: /Registry File Path/i })
      ).toHaveValue('/home/user/registry.json')
    })

    expect(mockElectronAPI.selectFile).toHaveBeenCalled()
    expect(mockElectronAPI.selectFolder).not.toHaveBeenCalled()
    window.electronAPI = originalElectronAPI
  })

  it('includes auth in PUT when Registry Server API OAuth fields are set', async () => {
    const rec = recordRequests()
    const apiUrl = 'http://localhost:8080/api/registry'
    const clientId = 'registry-oauth-client'
    const issuerUrl = 'https://id.example.com'

    mockedPutApiV1BetaRegistryByName.override(() => ({
      message: 'Registry updated successfully',
      type: 'api',
    }))

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Registry Server API' })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Client ID/i)).toBeVisible()
    })

    await userEvent.type(
      screen.getByLabelText(/Registry Server API URL/i),
      apiUrl
    )
    await userEvent.type(screen.getByLabelText(/Client ID/i), clientId)
    await userEvent.type(screen.getByLabelText(/Issuer URL/i), issuerUrl)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const putRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'PUT' &&
          req.pathname === '/api/v1beta/registry/default'
      )
      expect(putRequests).toHaveLength(1)
      expect(putRequests[0]?.payload).toEqual({
        api_url: apiUrl,
        allow_private_ip: true,
        auth: {
          client_id: clientId,
          issuer: issuerUrl,
        },
      })
    })
  })

  it('saves api_url without auth when OAuth fields are empty', async () => {
    const rec = recordRequests()
    const apiUrl = 'http://localhost:8080/api/registry'

    mockedPutApiV1BetaRegistryByName.override(() => ({
      message: 'Registry updated successfully',
      type: 'api',
    }))

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Registry Server API' })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry Server API URL/i)).toBeVisible()
    })

    await userEvent.type(
      screen.getByLabelText(/Registry Server API URL/i),
      apiUrl
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const putRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'PUT' &&
          req.pathname === '/api/v1beta/registry/default'
      )
      expect(putRequests).toHaveLength(1)
      expect(putRequests[0]?.payload).toEqual({
        api_url: apiUrl,
        allow_private_ip: true,
      })
    })

    const loginRequests = rec.recordedRequests.filter(
      (req) =>
        req.method === 'POST' &&
        req.pathname === '/api/v1beta/registry/auth/login'
    )
    expect(loginRequests).toHaveLength(0)
  })

  it('shows validation error for empty API URL', async () => {
    const rec = recordRequests()

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    const selectTrigger = screen.getByRole('combobox')
    await userEvent.click(selectTrigger)

    const apiUrlOption = screen.getByRole('option', {
      name: 'Registry Server API',
    })
    await userEvent.click(apiUrlOption)

    await waitFor(() => {
      expect(screen.getByText('Registry Server API URL')).toBeVisible()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(
        screen.getByText('Registry Server API URL is required')
      ).toBeVisible()
    })

    const putRequests = rec.recordedRequests.filter(
      (req) =>
        req.method === 'PUT' && req.pathname === '/api/v1beta/registry/default'
    )
    expect(putRequests).toHaveLength(0)
  })

  it('shows validation error for invalid API URL format', async () => {
    const rec = recordRequests()

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    const selectTrigger = screen.getByRole('combobox')
    await userEvent.click(selectTrigger)

    const apiUrlOption = screen.getByRole('option', {
      name: 'Registry Server API',
    })
    await userEvent.click(apiUrlOption)

    await waitFor(() => {
      expect(screen.getByText('Registry Server API URL')).toBeVisible()
    })

    const apiUrlInput = screen.getByLabelText(/Registry Server API URL/i)
    await userEvent.type(apiUrlInput, 'not-a-valid-url')

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(
        screen.getByText('Registry Server API must be a valid URL')
      ).toBeVisible()
    })

    const putRequests = rec.recordedRequests.filter(
      (req) =>
        req.method === 'PUT' && req.pathname === '/api/v1beta/registry/default'
    )
    expect(putRequests).toHaveLength(0)
  })

  it('pre-selects Registry Server API when GET returns registry_auth_required', async () => {
    mockedGetApiV1BetaRegistry.overrideHandler(() =>
      HttpResponse.json(
        {
          code: 'registry_auth_required',
          message:
            "Registry authentication required. Run 'thv registry login' to authenticate.",
        },
        { status: 401 }
      )
    )

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent(
        'Registry Server API'
      )
    })

    expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()

    // All fields empty → general OIDC box message shown, no field-level text
    await waitFor(() => {
      expect(
        screen.getByText(
          /The configured registry server requires authentication/
        )
      ).toBeVisible()
    })
    expect(
      screen.queryByText(REGISTRY_WRONG_AUTH_TOAST)
    ).not.toBeInTheDocument()
  })

  it('shows error message when GET API returns 500', async () => {
    mockedGetApiV1BetaRegistry.activateScenario('server-error')

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Registry Server API' })
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          'Failed to load registry configuration. The registry source may be misconfigured or unavailable.'
        )
      ).toBeVisible()
    })
  })

  it('populates form with existing registry data from API', async () => {
    mockedGetApiV1BetaRegistry.override((data) => {
      const first = data.registries?.[0]
      return {
        registries: [
          {
            ...first,
            type: 'api',
            source: 'http://localhost:8080/api/registry',
          },
        ],
      }
    })

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent(
        'Registry Server API'
      )
    })

    const apiUrlInput = screen.getByLabelText(/Registry Server API URL/i)
    expect(apiUrlInput).toHaveValue('http://localhost:8080/api/registry')
  })

  it('calls logout and shows error on client_id field when login fails', async () => {
    const rec = recordRequests()
    const apiUrl = 'http://localhost:8080/api/registry'

    mockedPutApiV1BetaRegistryByName.override(() => ({
      type: 'api',
      source: apiUrl,
    }))
    mockedPostApiV1BetaRegistryAuthLogin.activateScenario('server-error')

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Registry Server API' })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry Server API URL/i)).toBeVisible()
    })

    await userEvent.type(
      screen.getByLabelText(/Registry Server API URL/i),
      apiUrl
    )
    await userEvent.type(screen.getByLabelText(/Client ID/i), 'bad-client')
    await userEvent.type(
      screen.getByLabelText(/Issuer URL/i),
      'https://issuer.example.com'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      const logoutRequests = rec.recordedRequests.filter(
        (req) =>
          req.method === 'POST' &&
          req.pathname === '/api/v1beta/registry/auth/logout'
      )
      expect(logoutRequests).toHaveLength(1)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
    })

    // Field-level error shown on client_id
    expect(screen.getByText(REGISTRY_WRONG_AUTH_TOAST)).toBeVisible()
    // General OIDC error message should NOT appear for login failures
    expect(
      screen.queryByText(
        'Failed to load registry configuration. The registry source may be misconfigured or unavailable.'
      )
    ).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent(
      'Registry Server API'
    )
  })

  it('shows "Registry updated successfully" toast after save', async () => {
    const url = 'https://domain.com/registry.json'

    mockedPutApiV1BetaRegistryByName.override(() => ({ type: 'remote' }))

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Remote Registry (JSON URL)' })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry URL/i)).toBeVisible()
    })

    await userEvent.type(screen.getByLabelText(/Registry URL/i), url)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(
        vi
          .mocked(toast.promise)
          .mock.calls.some(
            (call) =>
              (call[1] as { success?: string }).success ===
              'Registry updated successfully'
          )
      ).toBe(true)
    })
  })

  it('shows issuer_url field error when PUT fails with OIDC discovery error', async () => {
    mockedPutApiV1BetaRegistryByName.overrideHandler(
      () =>
        new HttpResponse(
          'OIDC discovery failed: unable to fetch configuration',
          {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          }
        )
    )

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Registry Server API' })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry Server API URL/i)).toBeVisible()
    })

    await userEvent.type(
      screen.getByLabelText(/Registry Server API URL/i),
      'http://localhost:8080/api'
    )
    await userEvent.type(screen.getByLabelText(/Client ID/i), 'my-client')
    await userEvent.type(
      screen.getByLabelText(/Issuer URL/i),
      'https://wrong-issuer.example.com'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'OIDC discovery failed. Make sure the Issuer URL is correct.'
        )
      ).toBeVisible()
    })
  })

  it('clears form errors when registry type is changed', async () => {
    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Remote Registry (JSON URL)' })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry URL/i)).toBeVisible()
    })

    await userEvent.type(
      screen.getByLabelText(/Registry URL/i),
      'http://not-https.com/registry.json'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(
        screen.getByText('Remote registry must be a valid HTTPS URL')
      ).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Registry Server API' })
    )

    await waitFor(() => {
      expect(
        screen.queryByText('Remote registry must be a valid HTTPS URL')
      ).not.toBeInTheDocument()
    })
  })

  it('preserves source URL after login failure', async () => {
    const apiUrl = 'http://localhost:8080/api/registry'

    mockedPutApiV1BetaRegistryByName.override(() => ({
      type: 'api',
      source: apiUrl,
    }))
    mockedPostApiV1BetaRegistryAuthLogin.activateScenario('server-error')

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Registry Server API' })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry Server API URL/i)).toBeVisible()
    })

    await userEvent.type(
      screen.getByLabelText(/Registry Server API URL/i),
      apiUrl
    )
    await userEvent.type(screen.getByLabelText(/Client ID/i), 'bad-client')
    await userEvent.type(
      screen.getByLabelText(/Issuer URL/i),
      'https://issuer.example.com'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText(REGISTRY_WRONG_AUTH_TOAST)).toBeVisible()
    })

    // Source URL must still be populated (keepDirtyValues)
    expect(screen.getByLabelText(/Registry Server API URL/i)).toHaveValue(
      apiUrl
    )
  })

  it('shows validation error for invalid issuer URL format', async () => {
    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Registry Server API' })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry Server API URL/i)).toBeVisible()
    })

    await userEvent.type(
      screen.getByLabelText(/Registry Server API URL/i),
      'http://localhost:8080/api'
    )
    await userEvent.type(
      screen.getByLabelText(/Issuer URL/i),
      'not-a-valid-url'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Issuer URL must be a valid URL')).toBeVisible()
    })
  })

  it('shows client_id field error and OIDC box when login fails after GET registry_auth_required with existing config', async () => {
    const apiUrl = 'http://localhost:8080/api/registry'

    let getCallCount = 0
    mockedGetApiV1BetaRegistry.overrideHandler(() => {
      getCallCount++
      if (getCallCount === 1) {
        return HttpResponse.json({
          registries: [
            {
              name: 'default',
              type: 'api',
              source: apiUrl,
              auth_config: {
                client_id: 'my-client',
                issuer: 'https://issuer.example.com',
              },
            },
          ],
        })
      }
      return HttpResponse.json(
        {
          code: 'registry_auth_required',
          message: 'Registry authentication required.',
        },
        { status: 401 }
      )
    })

    mockedPutApiV1BetaRegistryByName.override(() => ({
      type: 'api',
      source: apiUrl,
    }))
    mockedPostApiV1BetaRegistryAuthLogin.activateScenario('server-error')

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry Server API URL/i)).toHaveValue(
        apiUrl
      )
    })

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText(REGISTRY_WRONG_AUTH_TOAST)).toBeVisible()
    })
    expect(screen.getByText(REGISTRY_AUTH_REQUIRED_UI_MESSAGE)).toBeVisible()
  })

  it('pre-selects Registry Server API and shows source error when GET returns registry_unavailable', async () => {
    const misconfiguredUrl = 'https://wrong-host.example.com/'

    mockedGetApiV1BetaRegistry.overrideHandler(() =>
      HttpResponse.json(
        {
          code: 'registry_unavailable',
          message: `upstream registry at ${misconfiguredUrl} is unavailable: registry API returned status 404`,
        },
        { status: 503 }
      )
    )

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent(
        'Registry Server API'
      )
    })

    expect(
      screen.getByText(
        'The Registry Server API URL is not correct. Make sure it points to a valid MCP Registry API endpoint.'
      )
    ).toBeVisible()

    expect(screen.getByLabelText(/Registry Server API URL/i)).toHaveValue(
      misconfiguredUrl
    )
  })

  it('shows only OIDC box message when GET returns registry_auth_required with existing auth config', async () => {
    const apiUrl = 'http://localhost:8080/api/registry'

    let getCallCount = 0
    mockedGetApiV1BetaRegistry.overrideHandler(() => {
      getCallCount++
      if (getCallCount === 1) {
        return HttpResponse.json({
          registries: [
            {
              name: 'default',
              type: 'api',
              source: apiUrl,
              auth_config: {
                client_id: 'my-client',
                issuer: 'https://issuer.example.com',
              },
            },
          ],
        })
      }
      return HttpResponse.json(
        {
          code: 'registry_auth_required',
          message: 'Registry authentication required.',
        },
        { status: 401 }
      )
    })

    const { queryClient } = renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry Server API URL/i)).toHaveValue(
        apiUrl
      )
    })

    await act(async () => {
      await queryClient.invalidateQueries()
    })

    await waitFor(() => {
      expect(screen.getByText(REGISTRY_AUTH_REQUIRED_UI_MESSAGE)).toBeVisible()
    })

    expect(
      screen.queryByText(REGISTRY_WRONG_AUTH_TOAST)
    ).not.toBeInTheDocument()
  })

  it('shows field-specific errors when submitting api_url with missing auth fields', async () => {
    const apiUrl = 'http://localhost:8080/api/registry'

    mockedPutApiV1BetaRegistryByName.overrideHandler(
      () =>
        new HttpResponse(
          'auth.issuer and auth.client_id are required when using OAuth',
          {
            status: 400,
            headers: { 'Content-Type': 'text/plain' },
          }
        )
    )

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Registry Server API' })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry Server API URL/i)).toBeVisible()
    })

    await userEvent.type(
      screen.getByLabelText(/Registry Server API URL/i),
      apiUrl
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Client ID is required')).toBeVisible()
    })
    expect(screen.getByText('Issuer URL is required')).toBeVisible()
  })

  it('updates cache with correct type mapping after mutation', async () => {
    const apiUrl = 'http://localhost:8080/api/registry'

    mockedPutApiV1BetaRegistryByName.override(() => ({
      message: 'Registry updated successfully',
      type: 'api',
      source: apiUrl,
    }))

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(
      screen.getByRole('option', { name: 'Registry Server API' })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry Server API URL/i)).toBeVisible()
    })

    const apiUrlInput = screen.getByLabelText(/Registry Server API URL/i)
    await userEvent.type(apiUrlInput, apiUrl)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry Server API URL/i)).toHaveValue(
        apiUrl
      )
    })

    expect(screen.getByRole('combobox')).toHaveTextContent(
      'Registry Server API'
    )
  })
})
