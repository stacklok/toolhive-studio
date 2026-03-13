import { ipcMain } from 'electron'
import {
  getIsAutoUpdateEnabled,
  getLatestAvailableVersion,
  getUpdateState,
  manualUpdate,
  setAutoUpdateEnabled,
} from '../auto-update'
import log from '../logger'

export function register() {
  ipcMain.handle('auto-update:set', async (_, enabled: boolean) => {
    setAutoUpdateEnabled(enabled)
    return enabled
  })

  ipcMain.handle('auto-update:get', () => {
    return getIsAutoUpdateEnabled()
  })

  ipcMain.handle('manual-update', async () => {
    log.info('[update] triggered manual update')
    manualUpdate()
  })

  ipcMain.handle('get-app-version', async () => {
    const versionInfo = await getLatestAvailableVersion()
    return versionInfo
  })

  ipcMain.handle('get-update-state', async () => {
    return getUpdateState()
  })
}
