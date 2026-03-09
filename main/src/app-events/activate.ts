import { app, BrowserWindow } from 'electron'
import { createMainWindow, showMainWindow } from '../main-window'
import { showInDock } from '../dock-utils'
import log from '../logger'

export function register() {
  app.on('activate', async () => {
    try {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createMainWindow()
      } else {
        showInDock()
        await showMainWindow()
      }
    } catch (error) {
      log.error('Failed to handle app activation:', error)
    }
  })
}
