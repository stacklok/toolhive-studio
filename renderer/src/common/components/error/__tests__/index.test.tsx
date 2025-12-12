import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Error as ErrorComponent } from '../index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/node'

vi.mock('../../layout/top-nav/minimal', () => ({
  TopNavMinimal: () => {
    return <div />
  },
}))

const mockElectronAPI = {
  isLinux: false,
  isMac: false,
  isWindows: false,
  platform: 'win32',
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

describe('Error', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()

    // Mock container-engines endpoint to avoid triggering ConnectionRefusedError
    server.use(
      http.get('*/container-engines', () => {
        return HttpResponse.json({ available: true })
      })
    )
  })

  it('renders <KeyringError /> when error contains "OS keyring is not available" and platform is Linux', () => {
    const keyringError = new Error('OS keyring is not available', {
      cause: { containerEngineAvailable: true },
    })
    mockElectronAPI.isLinux = true
    mockElectronAPI.platform = 'linux'

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorComponent
          error={
            keyringError as Error & {
              cause?: { containerEngineAvailable?: boolean }
            }
          }
        />
      </QueryClientProvider>
    )

    expect(screen.getByText('System Keyring Cannot be Reached')).toBeVisible()
    expect(
      screen.getByText(/ToolHive needs to access your system keyring/)
    ).toBeVisible()
  })

  it('renders generic error when keyring error occurs on non-Linux platform', () => {
    const keyringError = new Error('OS keyring is not available', {
      cause: { containerEngineAvailable: true },
    })

    mockElectronAPI.isLinux = false
    mockElectronAPI.platform = 'win32'

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorComponent
          error={
            keyringError as Error & {
              cause?: { containerEngineAvailable?: boolean }
            }
          }
        />
      </QueryClientProvider>
    )

    expect(screen.getByText('Oops, something went wrong')).toBeVisible()
    expect(
      screen.getByText(/We're sorry, but something unexpected happened/)
    ).toBeVisible()

    // Verify that the CUSTOM keyring error is NOT shown
    expect(
      screen.queryByText('System Keyring Cannot be Reached')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/ToolHive needs to access your system keyring/)
    ).not.toBeInTheDocument()
  })

  it('renders generic error properly', () => {
    const genericError = new Error('Something unexpected happened', {
      cause: { containerEngineAvailable: true },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ErrorComponent
          error={
            genericError as Error & {
              cause?: { containerEngineAvailable?: boolean }
            }
          }
        />
      </QueryClientProvider>
    )

    expect(screen.getByText('Oops, something went wrong')).toBeVisible()
    expect(
      screen.getByText(/We're sorry, but something unexpected happened/)
    ).toBeVisible()
  })
})
