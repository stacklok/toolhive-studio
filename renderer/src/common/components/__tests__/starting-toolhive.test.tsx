import { render, screen, cleanup, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { StartingToolHive } from '../starting-toolhive'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HttpResponse } from 'msw'
import { mockedGetHealth } from '../../mocks/fixtures/health/get'

const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../layout/top-nav/quit-confirmation-listener', () => ({
  QuitConfirmationListener: () => null,
}))

vi.mock('../layout/top-nav/window-controls', () => ({
  WindowControls: () => null,
}))

vi.mock('electron-log/renderer', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('StartingToolHive', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.useFakeTimers()
    mockNavigate.mockClear()
    // Health check is a 204 with no body; keep tests aligned with API semantics.
    mockedGetHealth.overrideHandler(
      () => new HttpResponse(null, { status: 204 })
    )
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('should display loading state with loader', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StartingToolHive />
      </QueryClientProvider>
    )

    expect(
      screen.getByText('Starting ToolHive configuration')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/checking your ToolHive configuration/i)
    ).toBeInTheDocument()
  })

  it('should throw error when health check fails', async () => {
    mockedGetHealth.overrideHandler(() => HttpResponse.error())

    render(
      <QueryClientProvider client={queryClient}>
        <StartingToolHive />
      </QueryClientProvider>
    )

    expect(
      screen.getByText('Starting ToolHive configuration')
    ).toBeInTheDocument()

    // Advance timers for all retries (10 retries × 300ms = 3000ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })

    // After all retries fail, error screen should be displayed
    expect(
      screen.queryByText('Starting ToolHive configuration')
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/we're sorry, but something unexpected happened/i)
    ).toBeInTheDocument()

    expect(screen.getByText(/try reloading the app/i)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should navigate when health check succeeds', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <StartingToolHive />
      </QueryClientProvider>
    )

    // Advance timers to complete the query
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    // After advancing timers, navigation should have been called
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/group/$groupName',
      params: { groupName: 'default' },
    })
  })
})
