import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RegistryTab } from '../registry-tab'
import { ConfirmProvider } from '@/common/contexts/confirm/provider'
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
    <ConfirmProvider>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </ConfirmProvider>
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

    expect(
      screen.getByRole('button', { name: 'Reset to default' })
    ).toBeVisible()
  })

  it('handles remote registry configuration', async () => {
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

    expect(
      screen.getByRole('button', { name: 'Reset to default' })
    ).not.toBeDisabled()
    const urlInput = screen.getByLabelText(/Registry URL/i)
    await userEvent.type(urlInput, 'https://domain.com/registry.json')

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    expect(putApiV1BetaRegistryByName).toHaveBeenCalledWith({
      path: {
        name: 'default',
      },
      body: {
        url: 'https://domain.com/registry.json',
      },
    })
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

    expect(putApiV1BetaRegistryByName).toHaveBeenCalledWith({
      path: {
        name: 'default',
      },
      body: {
        local_path: '/path/to/local/registry.json',
      },
    })

    const resetButton = screen.getByText('Reset to default')
    await userEvent.click(resetButton)

    expect(putApiV1BetaRegistryByName).toHaveBeenCalledWith({
      path: {
        name: 'default',
      },
      body: {
        local_path: undefined,
      },
    })
  })
})
