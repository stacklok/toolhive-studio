import { ipcMain } from 'electron'
import { writeSetting } from '../db/writers/settings-writer'
import { getIsTelemetryEnabled } from '../telemetry-settings'

export function register() {
  ipcMain.handle('sentry.is-enabled', () => getIsTelemetryEnabled())

  ipcMain.handle('sentry.opt-out', (): boolean => {
    writeSetting('isTelemetryEnabled', 'false')
    return false
  })

  ipcMain.handle('sentry.opt-in', (): boolean => {
    writeSetting('isTelemetryEnabled', 'true')
    return true
  })
}
