import { useEffect, useState } from 'react'
import type { Theme } from '../../contexts/theme-context'
import { ThemeProviderContext } from '../../contexts/theme-context'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const isValidTheme = (value: string | null): value is Theme => {
  const validThemes = ['dark', 'light', 'system']
  return value !== null && validThemes.includes(value)
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'toolhive-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem(storageKey)
    return isValidTheme(storedTheme) ? storedTheme : defaultTheme
  })

  useEffect(() => {
    const syncWithNativeTheme = async () => {
      if (window.electronAPI?.darkMode) {
        try {
          const storedTheme = localStorage.getItem(storageKey)

          if (!isValidTheme(storedTheme)) {
            const nativeThemeState = await window.electronAPI.darkMode.get()
            setTheme(nativeThemeState.themeSource)
            localStorage.setItem(storageKey, nativeThemeState.themeSource)
          }
        } catch (error) {
          console.warn('Failed to sync with native theme:', error)
        }
      }
    }

    syncWithNativeTheme()
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const value = {
    theme,
    setTheme: async (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)

      if (window.electronAPI?.darkMode) {
        try {
          await window.electronAPI.darkMode.set(newTheme)
        } catch (error) {
          console.warn('Failed to sync theme with Electron:', error)
        }
      }
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
