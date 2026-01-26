import { render, screen, waitFor, act, cleanup } from '@testing-library/react'
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest'
import { setSystemTheme } from '@mocks/matchMedia'
import { ThemeProvider } from '../theme-provider'
import { useTheme } from '../../../hooks/use-theme'

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
    ;(window.electronAPI.darkMode.get as Mock).mockResolvedValue({
      shouldUseDarkColors: false,
      themeSource: 'system',
    })
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('keeps stored theme even if Electron reports something else', async () => {
    localStorage.setItem('toolhive-ui-theme', 'dark')
    ;(window.electronAPI.darkMode.get as Mock).mockResolvedValue({
      shouldUseDarkColors: false,
      themeSource: 'system',
    })

    render(
      <ThemeProvider>
        <TestComponent id="stored" />
      </ThemeProvider>
    )

    expect(screen.getByTestId('stored')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')

    await waitFor(() =>
      expect(screen.getByTestId('stored')).toHaveTextContent('dark')
    )

    expect(localStorage.getItem('toolhive-ui-theme')).toBe('dark')
  })

  it('seeds localStorage from Electron when nothing stored', async () => {
    ;(window.electronAPI.darkMode.get as Mock).mockResolvedValue({
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
    expect(window.electronAPI.darkMode.set).toHaveBeenCalledWith('light')
  })

  it('listens to system theme changes when theme is system', async () => {
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
