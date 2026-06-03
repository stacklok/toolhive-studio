import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TechnicalDetails } from '../technical-details'
import { APP_DISPLAY_NAME } from '@common/app-info'

vi.mock('../../layout/top-nav/minimal', () => ({
  TopNavMinimal: () => <div />,
}))

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('TechnicalDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    window.electronAPI.platform = 'darwin'
    window.electronAPI.getAppVersion = vi.fn().mockResolvedValue({
      currentVersion: '0.34.0',
      latestVersion: '0.34.0',
      isNewVersionAvailable: false,
    })
    window.electronAPI.getToolhiveVersion = vi.fn().mockReturnValue('0.8.0')
    window.electronAPI.isOfficialReleaseBuild = vi.fn().mockResolvedValue(false)
    window.electronAPI.getToolhiveStatus = vi
      .fn()
      .mockResolvedValue({ isRunning: false, processError: null })
    window.electronAPI.checkContainerEngine = vi
      .fn()
      .mockResolvedValue({ available: true })
  })

  it('renders collapsed by default with show details toggle', () => {
    const error = new Error('Something broke')

    renderWithProviders(<TechnicalDetails error={error} />)

    expect(screen.getByRole('button', { name: /show details/i })).toBeVisible()
    expect(screen.queryByText(/Something broke/)).not.toBeInTheDocument()
  })

  it('shows error name and message when expanded', async () => {
    const user = userEvent.setup()
    const error = new TypeError('Cannot read property x')

    renderWithProviders(<TechnicalDetails error={error} />)

    await user.click(screen.getByRole('button', { name: /show details/i }))

    expect(screen.getByText('TypeError: Cannot read property x')).toBeVisible()
  })

  it('shows metadata and stack trace when expanded', async () => {
    const user = userEvent.setup()
    const error = new Error('Stack test')
    error.stack = 'Error: Stack test\n    at Component (file.tsx:42:5)'

    renderWithProviders(<TechnicalDetails error={error} />)

    await user.click(screen.getByRole('button', { name: /show details/i }))

    expect(screen.getByText(/at Component \(file\.tsx:42:5\)/)).toBeVisible()
    expect(screen.getByRole('button', { name: /hide details/i })).toBeVisible()

    await waitFor(() => {
      expect(screen.getByText(/Desktop: 0\.34\.0/)).toBeVisible()
    })
    expect(screen.getByText(/CLI: 0\.8\.0/)).toBeVisible()
    expect(screen.getByText(/Platform: darwin/)).toBeVisible()
    expect(screen.getByText(/ToolHive: no/)).toBeVisible()
    expect(screen.getByText(/Engine: available/)).toBeVisible()
  })

  it('copies full crash report to clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    const error = new Error('Crash error')
    error.stack = 'Error: Crash error\n    at Component (file.tsx:42:5)'

    renderWithProviders(<TechnicalDetails error={error} />)

    await user.click(screen.getByRole('button', { name: /show details/i }))
    await user.click(screen.getByRole('button', { name: /copy error report/i }))

    expect(writeText).toHaveBeenCalledTimes(1)
    const reportText = writeText.mock.calls[0]?.[0] as string
    expect(reportText).toContain(`${APP_DISPLAY_NAME} Crash Report`)
    expect(reportText).toContain('Error: Crash error')
    expect(reportText).toContain('Desktop Version:')
    expect(reportText).toContain('CLI Version:')
    expect(reportText).toContain('Platform:')
    expect(reportText).toContain('ToolHive Running:')
    expect(reportText).toContain('Container Engine:')
    expect(reportText).toContain('Stack Trace:')
    expect(reportText).toContain('at Component (file.tsx:42:5)')
  })

  it('shows copied feedback after clicking copy', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    })

    const error = new Error('Test error')

    renderWithProviders(<TechnicalDetails error={error} />)

    await user.click(screen.getByRole('button', { name: /show details/i }))
    await user.click(screen.getByRole('button', { name: /copy error report/i }))

    expect(screen.getByRole('button', { name: /copied/i })).toBeVisible()
  })

  it('handles missing stack trace gracefully', async () => {
    const user = userEvent.setup()
    const error = new Error('No stack')
    error.stack = undefined

    const { container } = renderWithProviders(
      <TechnicalDetails error={error} />
    )

    await user.click(screen.getByRole('button', { name: /show details/i }))

    expect(screen.getByText(/No stack/)).toBeVisible()
    expect(container.querySelector('code')).not.toBeInTheDocument()
  })
})
