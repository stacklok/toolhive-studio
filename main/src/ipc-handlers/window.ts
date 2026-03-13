import { ipcMain } from 'electron'
import {
  minimizeMainWindow,
  toggleMaximizeMainWindow,
  closeMainWindow,
  isMainWindowMaximized,
} from '../main-window'
import log from '../logger'

export function register() {
  ipcMain.handle('window-minimize', () => {
    try {
      minimizeMainWindow()
    } catch (error) {
      log.error('Failed to minimize window:', error)
    }
  })

  ipcMain.handle('window-maximize', () => {
    try {
      toggleMaximizeMainWindow()
    } catch (error) {
      log.error('Failed to maximize window:', error)
    }
  })

  ipcMain.handle('window-close', () => {
    try {
      closeMainWindow()
    } catch (error) {
      log.error('Failed to close window:', error)
    }
  })

  ipcMain.handle('window-is-maximized', () => {
    try {
      return isMainWindowMaximized()
    } catch (error) {
      log.error('Failed to check if window is maximized:', error)
      return false
    }
  })
}
