import { ipcMain, nativeTheme } from 'electron'

export function register() {
  ipcMain.handle('dark-mode:toggle', () => {
    nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark'
    return nativeTheme.shouldUseDarkColors
  })

  ipcMain.handle('dark-mode:system', () => {
    nativeTheme.themeSource = 'system'
    return nativeTheme.shouldUseDarkColors
  })

  ipcMain.handle(
    'dark-mode:set',
    (_event, theme: 'light' | 'dark' | 'system') => {
      nativeTheme.themeSource = theme
      return nativeTheme.shouldUseDarkColors
    }
  )

  ipcMain.handle('dark-mode:get', () => ({
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource,
  }))
}
