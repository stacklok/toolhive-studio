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
  const [theme, setThemeState] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem(storageKey)
    return isValidTheme(storedTheme) ? storedTheme : defaultTheme
  })

  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(
    'light'
  )

  // Initialize and sync with Electron's native theme
  useEffect(() => {
    const initializeTheme = async () => {
      const storedTheme = localStorage.getItem(storageKey)

      // If we have a valid stored theme, use it immediately
      if (isValidTheme(storedTheme)) {
        if (storedTheme === 'system') {
          // For system theme, we need to check Electron's current state
          if (window.electronAPI?.darkMode) {
            try {
              const nativeThemeState = await window.electronAPI.darkMode.get()
              setEffectiveTheme(
                nativeThemeState.shouldUseDarkColors ? 'dark' : 'light'
              )
            } catch (error) {
              console.warn('Failed to get native theme state:', error)
              setEffectiveTheme('light')
            }
          }
        } else {
          setEffectiveTheme(storedTheme)
        }
        return
      }

      // No stored theme - sync with Electron's native theme
      if (window.electronAPI?.darkMode) {
        try {
          const nativeThemeState = await window.electronAPI.darkMode.get()
          setThemeState(nativeThemeState.themeSource)
          localStorage.setItem(storageKey, nativeThemeState.themeSource)

          if (nativeThemeState.themeSource === 'system') {
            setEffectiveTheme(
              nativeThemeState.shouldUseDarkColors ? 'dark' : 'light'
            )
          } else {
            setEffectiveTheme(nativeThemeState.themeSource)
          }
        } catch (error) {
          console.warn('Failed to initialize theme:', error)
          setEffectiveTheme('light')
        }
      }
    }

    initializeTheme()
  }, [theme, storageKey])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system' || !window.electronAPI?.darkMode) return

    const cleanup = window.electronAPI.darkMode.onUpdated((isDark: boolean) => {
      setEffectiveTheme(isDark ? 'dark' : 'light')
    })

    return cleanup
  }, [theme])

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(effectiveTheme)
  }, [effectiveTheme])

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(storageKey, newTheme)

    // Update effective theme immediately for non-system themes
    if (newTheme !== 'system') {
      setEffectiveTheme(newTheme)
    }

    // Sync with Electron
    if (window.electronAPI?.darkMode) {
      try {
        await window.electronAPI.darkMode.set(newTheme)

        // Update effective theme for system theme
        if (newTheme === 'system') {
          const nativeThemeState = await window.electronAPI.darkMode.get()
          setEffectiveTheme(
            nativeThemeState.shouldUseDarkColors ? 'dark' : 'light'
          )
        }
      } catch (error) {
        console.warn('Failed to sync theme with Electron:', error)
      }
    }
  }

  const value = {
    theme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
