import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RegistryTab } from '../../registry/registry-tab'
import { PromptProvider } from '@/common/contexts/prompt/provider'
import { putApiV1BetaRegistryByName } from '@api/sdk.gen'

vi.mock('@api/sdk.gen', () => ({
  putApiV1BetaRegistryByName: vi.fn(),
}))

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
  beforeEach(() => {
    vi.mocked(putApiV1BetaRegistryByName).mockResolvedValue({
      data: {
        message: 'Registry updated successfully',
        type: 'remote',
      },
      request: new Request('http://localhost/fake-url'),
      response: new Response(),
    })
  })

  it('renders registry settings with default state', async () => {
    renderWithProviders(<RegistryTab />)

    expect(screen.getByText('Registry')).toBeVisible()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })
    expect(screen.getByText('Registry Type')).toBeVisible()
  })

  it.each([
    {
      description: 'with .json extension',
      url: 'https://domain.com/registry.json',
    },
    {
      // reproduces bug: https://github.com/stacklok/toolhive-studio/issues/742
      description: 'without .json extension',
      url: 'https://domain.com/registry',
    },
  ])('handles remote registry configuration $description', async ({ url }) => {
    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeVisible()
    })

    const selectTrigger = screen.getByRole('combobox')
    await userEvent.click(selectTrigger)

    const remoteOptions = screen.getByRole('option', {
      name: 'Remote Registry (URL)',
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

    await waitFor(() =>
      expect(putApiV1BetaRegistryByName).toHaveBeenCalledWith({
        path: {
          name: 'default',
        },
        body: {
          url,
        },
      })
    )
  })

  it('handles local registry configuration', async () => {
    renderWithProviders(<RegistryTab />)

    await waitFor(() => {
      expect(screen.getByText('Registry')).toBeVisible()
    })
    const selectTrigger = screen.getByRole('combobox')
    await userEvent.click(selectTrigger)

    const localOptions = screen.getByRole('option', {
      name: 'Local Registry (File Path)',
    })
    expect(localOptions).toBeVisible()

    await userEvent.click(
      screen.getByRole('option', {
        name: 'Local Registry (File Path)',
      })
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/Registry File Path/i)).toBeVisible()
    })

    const pathInput = screen.getByLabelText(/Registry File Path/i)
    await userEvent.type(pathInput, '/path/to/local/registry.json')

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    await waitFor(() =>
      expect(putApiV1BetaRegistryByName).toHaveBeenCalledWith({
        path: {
          name: 'default',
        },
        body: {
          local_path: '/path/to/local/registry.json',
        },
      })
    )

    await userEvent.click(screen.getByRole('combobox'))
    const defaultOptions = screen.getByRole('option', {
      name: 'Default Registry',
    })
    expect(defaultOptions).toBeVisible()
    await userEvent.click(defaultOptions)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(putApiV1BetaRegistryByName).toHaveBeenCalledWith({
        path: {
          name: 'default',
        },
        body: {
          local_path: undefined,
        },
      })
    )
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
        name: 'Local Registry (File Path)',
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
})
