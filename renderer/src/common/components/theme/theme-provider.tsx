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

  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(
    'light'
  )

  // Initialize effective theme based on current theme
  useEffect(() => {
    if (theme === 'system') {
      // For system theme, we need to check Electron's current state
      const updateEffectiveTheme = async () => {
        if (window.electronAPI?.darkMode) {
          try {
            const nativeThemeState = await window.electronAPI.darkMode.get()
            setEffectiveTheme(
              nativeThemeState.shouldUseDarkColors ? 'dark' : 'light'
            )
          } catch (error) {
            console.warn('Failed to get native theme state:', error)
            setEffectiveTheme('light') // fallback
          }
        }
      }
      updateEffectiveTheme()
    } else {
      setEffectiveTheme(theme)
    }
  }, [theme])

  // Sync with Electron's native theme only when there's no stored theme
  useEffect(() => {
    const syncWithNativeTheme = async () => {
      if (window.electronAPI?.darkMode) {
        try {
          const storedTheme = localStorage.getItem(storageKey)

          // Only sync if there's no stored theme
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

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system' || !window.electronAPI?.darkMode) return

    const cleanup = window.electronAPI.darkMode.onUpdated((isDark: boolean) => {
      setEffectiveTheme(isDark ? 'dark' : 'light')
    })

    return cleanup
  }, [theme])

  // Apply theme to document element
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(effectiveTheme)
  }, [effectiveTheme])

  const value = {
    theme,
    setTheme: async (newTheme: Theme) => {
      // Update state immediately
      setTheme(newTheme)
      localStorage.setItem(storageKey, newTheme)

      // Update effective theme immediately for non-system themes
      if (newTheme !== 'system') {
        setEffectiveTheme(newTheme)
      }

      // Sync with Electron's native theme
      if (window.electronAPI?.darkMode) {
        try {
          await window.electronAPI.darkMode.set(newTheme)
          // Update effective theme for system theme after getting current state
          if (newTheme === 'system') {
            const nativeThemeState = await window.electronAPI.darkMode.get()
            setEffectiveTheme(
              nativeThemeState.shouldUseDarkColors ? 'dark' : 'light'
            )
          }
        } catch (error) {
          console.warn(
            'Failed to sync theme with native Electron theme:',
            error
          )
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
