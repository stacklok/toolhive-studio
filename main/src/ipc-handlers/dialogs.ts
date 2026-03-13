import { ipcMain, dialog } from 'electron'
import { getMainWindow } from '../main-window'
import log from '../logger'

export function register() {
  ipcMain.handle('dialog:select-file', async () => {
    try {
      const mainWindow = getMainWindow()
      if (!mainWindow) return null

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
      })
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    } catch (error) {
      log.error('Failed to show file dialog:', error)
      return null
    }
  })

  ipcMain.handle('dialog:select-folder', async () => {
    try {
      const mainWindow = getMainWindow()
      if (!mainWindow) return null

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
      })
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    } catch (error) {
      log.error('Failed to show folder dialog:', error)
      return null
    }
  })
}
