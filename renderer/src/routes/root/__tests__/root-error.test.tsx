import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RootErrorComponent } from '../root-error'

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/common/components/layout/top-nav/window-controls', () => ({
  WindowControls: () => null,
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('RootErrorComponent', () => {
  it('renders StartingToolHive when toolhive is running and container engine available', () => {
    const error = new Error('Health check failed', {
      cause: {
        isToolhiveRunning: true,
        containerEngineAvailable: true,
      },
    })

    renderWithProviders(<RootErrorComponent error={error} />)

    expect(
      screen.getByText('Starting ToolHive configuration')
    ).toBeInTheDocument()
  })

  it('renders generic error when toolhive is not running', () => {
    const error = new Error('Health check failed', {
      cause: {
        isToolhiveRunning: false,
        containerEngineAvailable: true,
      },
    })

    renderWithProviders(<RootErrorComponent error={error} />)

    expect(screen.getByText('Oops, something went wrong')).toBeInTheDocument()
    expect(
      screen.queryByText('Starting ToolHive configuration')
    ).not.toBeInTheDocument()
  })

  it('renders connection refused error when container engine is not available', () => {
    const error = new Error('Health check failed', {
      cause: {
        isToolhiveRunning: true,
        containerEngineAvailable: false,
      },
    })

    renderWithProviders(<RootErrorComponent error={error} />)

    expect(screen.getByText('Connection Refused')).toBeInTheDocument()
    expect(
      screen.queryByText('Starting ToolHive configuration')
    ).not.toBeInTheDocument()
  })

  it('renders generic error for non-Error values', () => {
    renderWithProviders(<RootErrorComponent error="unexpected string error" />)

    expect(screen.getByText('Oops, something went wrong')).toBeInTheDocument()
  })

  it('renders generic error when cause is missing', () => {
    const error = new Error('Something broke')

    renderWithProviders(<RootErrorComponent error={error} />)

    expect(screen.getByText('Oops, something went wrong')).toBeInTheDocument()
  })
})
