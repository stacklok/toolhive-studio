import { useTheme } from '../../../common/hooks/use-theme'

/**
 * Maps our application theme to appropriate Shiki syntax highlighting themes
 */
export function getShikiTheme(
  appTheme: 'light' | 'dark' | 'system'
): 'github-dark' | 'github-light' {
  // Handle system theme by checking actual applied theme
  if (appTheme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return isDark ? 'github-dark' : 'github-light'
  }

  // Map our themes to Shiki themes
  const themeMap = {
    light: 'github-light',
    dark: 'github-dark',
  } as const

  return themeMap[appTheme] || 'github-light'
}

/**
 * Hook to get the current Shiki theme based on app theme
 */
export function useShikiTheme(): 'github-dark' | 'github-light' {
  const { theme } = useTheme()
  return getShikiTheme(theme)
}
