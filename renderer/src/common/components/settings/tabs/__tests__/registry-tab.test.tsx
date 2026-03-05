import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RegistryTab } from '../../registry/registry-tab'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { recordRequests } from '@/common/mocks/node'
import { mockedPutApiV1BetaRegistryByName } from '@/common/mocks/fixtures/registry_name/put'
import { mockedGetApiV1BetaRegistryByName } from '@/common/mocks/fixtures/registry_name/get'

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <PromptProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </PromptProvider>
  )
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

  it('handles API URL registry configuration with valid URL', async () => {
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

    const selectTrigger = screen.getByRole('combobox')
    await userEvent.click(selectTrigger)

    const apiUrlOption = screen.getByRole('option', {
      name: 'Registry Server API',
    })
    expect(apiUrlOption).toBeVisible()

    await userEvent.click(apiUrlOption)
    await waitFor(() => {
      expect(screen.getByText('Registry Server API URL')).toBeVisible()
    })

    const apiUrlInput = screen.getByLabelText(/Registry Server API URL/i)
    await userEvent.type(apiUrlInput, apiUrl)

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

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

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Registry URL is required')).toBeVisible()
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

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

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

  it('shows error message when GET API returns 500', async () => {
    mockedGetApiV1BetaRegistryByName.activateScenario('server-error')

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    // Select a type that shows the source field to see the error message
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
    mockedGetApiV1BetaRegistryByName.override((data) => ({
      ...data,
      type: 'api',
      source: 'http://localhost:8080/api/registry',
    }))

    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent(
        'Registry Server API'
      )
    })

    const apiUrlInput = screen.getByLabelText(/Registry Server API URL/i)
    expect(apiUrlInput).toHaveValue('http://localhost:8080/api/registry')
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

    // Change to API URL type
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

    // Verify the select still shows the correct type
    expect(screen.getByRole('combobox')).toHaveTextContent(
      'Registry Server API'
    )
  })
})
