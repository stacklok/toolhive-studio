import { ipcMain } from 'electron'
import {
  restartToolhive,
  getToolhiveSocketPath,
  isToolhiveRunning,
  getToolhiveStatus,
  isUsingCustomSocket,
} from '../toolhive-manager'
import { checkContainerEngine } from '../container-engine'
import { getLastShutdownServers, clearShutdownHistory } from '../graceful-exit'
import { registerApiFetchHandlers } from '../unix-socket-fetch'
import log from '../logger'

export function register() {
  ipcMain.handle('get-toolhive-socket-path', () => getToolhiveSocketPath())
  ipcMain.handle('is-toolhive-running', () => isToolhiveRunning())
  ipcMain.handle('get-toolhive-status', () => getToolhiveStatus())
  ipcMain.handle('is-using-custom-socket', () => isUsingCustomSocket())

  ipcMain.handle('check-container-engine', async () => {
    return await checkContainerEngine()
  })

  ipcMain.handle('restart-toolhive', async () => {
    try {
      await restartToolhive()
      return { success: true }
    } catch (error) {
      // eslint-disable-next-line no-restricted-syntax -- TODO: decide on branding in logs
      log.error('Failed to restart ToolHive: ', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle('shutdown-store:get-last-servers', () => {
    return getLastShutdownServers()
  })

  ipcMain.handle('shutdown-store:clear-history', () => {
    clearShutdownHistory()
    return { success: true }
  })

  registerApiFetchHandlers()
}
