import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Error as ErrorComponent } from '../index'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { extendElectronAPI } from '@mocks/electronAPI'

vi.mock('../../layout/top-nav/minimal', () => ({
  TopNavMinimal: () => {
    return <div />
  },
}))

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

    extendElectronAPI({
      isLinux: false,
      isMac: false,
      isWindows: false,
      platform: 'win32',
    })
  })

  it('renders <KeyringError /> when error contains "OS keyring is not available" and platform is Linux', () => {
    const keyringError = new Error('OS keyring is not available', {
      cause: { containerEngineAvailable: true },
    })
    extendElectronAPI({
      isLinux: true,
      isMac: false,
      isWindows: false,
      platform: 'linux',
    })

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

    // isLinux: false and platform: 'win32' are already set in beforeEach

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
