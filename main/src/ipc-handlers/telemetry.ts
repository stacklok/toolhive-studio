import { ipcMain } from 'electron'
import { telemetryStore } from '../telemetry-store'
import { writeSetting } from '../db/writers/settings-writer'
import log from '../logger'

export function register() {
  ipcMain.handle('sentry.is-enabled', () => {
    return telemetryStore.get('isTelemetryEnabled', true)
  })

  ipcMain.handle('sentry.opt-out', (): boolean => {
    telemetryStore.set('isTelemetryEnabled', false)
    try {
      writeSetting('isTelemetryEnabled', 'false')
    } catch (err) {
      log.error('[DB] Failed to dual-write isTelemetryEnabled:', err)
    }
    return telemetryStore.get('isTelemetryEnabled', false)
  })

  ipcMain.handle('sentry.opt-in', (): boolean => {
    telemetryStore.set('isTelemetryEnabled', true)
    try {
      writeSetting('isTelemetryEnabled', 'true')
    } catch (err) {
      log.error('[DB] Failed to dual-write isTelemetryEnabled:', err)
    }
    return true
  })
}
