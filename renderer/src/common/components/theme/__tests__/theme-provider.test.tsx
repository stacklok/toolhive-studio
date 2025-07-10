import { render, screen, waitFor, act, cleanup } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ThemeProvider } from '../theme-provider'
import { useTheme } from '../../../hooks/use-theme'

const mockElectronAPI = {
  darkMode: {
    get: vi.fn().mockResolvedValue({
      shouldUseDarkColors: false,
      themeSource: 'system',
    }),
    set: vi.fn().mockResolvedValue(true),
    onUpdated: vi.fn().mockReturnValue(() => {}),
  },
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
})

// Mock matchMedia with event support
const matchMediaListeners: Record<string, Set<(e: Event) => void>> = {}
const matchMediaMatches: Record<string, boolean> = {}
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => {
    matchMediaListeners[query] = matchMediaListeners[query] || new Set()
    matchMediaMatches[query] = matchMediaMatches[query] ?? false
    return {
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: (event: string, cb: (e: Event) => void) => {
        if (event === 'change') matchMediaListeners[query]?.add(cb)
      },
      removeEventListener: (event: string, cb: (e: Event) => void) => {
        if (event === 'change') matchMediaListeners[query]?.delete(cb)
      },
      dispatchEvent: (event: Event) => {
        if (event.type === 'change') {
          matchMediaListeners[query]?.forEach((cb) => cb(event))
        }
      },
      get matches() {
        return matchMediaMatches[query]
      },
    }
  }),
})
function setSystemTheme(isDark: boolean) {
  const query = '(prefers-color-scheme: dark)'
  matchMediaMatches[query] = isDark
  const event = new Event('change')
  Object.defineProperty(event, 'matches', { value: isDark })
  window.matchMedia(query).dispatchEvent(event)
}

function TestComponent({ id = 'theme' }: { id?: string }) {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid={id}>{theme}</span>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  )
}

describe('<ThemeProvider />', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    document.documentElement.className = ''
    // Reset mock to default state
    mockElectronAPI.darkMode.get.mockResolvedValue({
      shouldUseDarkColors: false,
      themeSource: 'system',
    })
    mockElectronAPI.darkMode.onUpdated.mockReturnValue(() => {})
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('keeps stored theme even if Electron reports something else', async () => {
    localStorage.setItem('toolhive-ui-theme', 'dark')
    mockElectronAPI.darkMode.get.mockResolvedValue({
      shouldUseDarkColors: false,
      themeSource: 'system',
    })

    render(
      <ThemeProvider>
        <TestComponent id="stored" />
      </ThemeProvider>
    )

    // first paint (sync)
    expect(screen.getByTestId('stored')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')

    // wait until all effects & promises settle
    await waitFor(() =>
      expect(screen.getByTestId('stored')).toHaveTextContent('dark')
    )

    // Don't expect Electron API to be called when we have a stored theme
    expect(localStorage.getItem('toolhive-ui-theme')).toBe('dark')
  })

  it('seeds localStorage from Electron when nothing stored', async () => {
    mockElectronAPI.darkMode.get.mockResolvedValue({
      shouldUseDarkColors: true,
      themeSource: 'dark',
    })

    render(
      <ThemeProvider>
        <TestComponent id="seed" />
      </ThemeProvider>
    )

    await waitFor(() =>
      expect(screen.getByTestId('seed')).toHaveTextContent('dark')
    )

    expect(localStorage.getItem('toolhive-ui-theme')).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('setTheme(light) updates everything consistently', async () => {
    // Start with a non-system theme
    localStorage.setItem('toolhive-ui-theme', 'dark')
    render(
      <ThemeProvider>
        <TestComponent id="update" />
      </ThemeProvider>
    )

    await act(async () => {
      screen.getByText('Light').click()
    })

    await waitFor(() =>
      expect(screen.getByTestId('update')).toHaveTextContent('light')
    )

    expect(document.documentElement).toHaveClass('light')
    expect(localStorage.getItem('toolhive-ui-theme')).toBe('light')
    expect(mockElectronAPI.darkMode.set).toHaveBeenCalledWith('light')
  })

  it('listens to system theme changes when theme is system', async () => {
    // Start in system mode
    render(
      <ThemeProvider>
        <TestComponent id="system" />
      </ThemeProvider>
    )
    await act(async () => {
      screen.getByText('System').click()
    })
    await waitFor(() =>
      expect(screen.getByTestId('system')).toHaveTextContent('system')
    )
    expect(document.documentElement).toHaveClass('light')

    // Simulate system theme change to dark
    setSystemTheme(true)
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'))

    // Simulate system theme change back to light
    setSystemTheme(false)
    await waitFor(() => expect(document.documentElement).toHaveClass('light'))
  })
})
