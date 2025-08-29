import { useTheme } from '../../../common/hooks/use-theme'

/**
 * Hook to get Shiki theme tuple for Streamdown component
 * Returns [light, dark] themes based on current app theme
 */
export function useShikiTheme(): [
  'github-dark' | 'github-light',
  'github-dark' | 'github-light',
] {
  const { theme } = useTheme()

  // Handle system theme by checking actual applied theme
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return isDark
      ? ['github-dark', 'github-light']
      : ['github-light', 'github-dark']
  }

  // Return themes with current theme first
  return theme === 'dark'
    ? ['github-dark', 'github-light']
    : ['github-light', 'github-dark']
}
