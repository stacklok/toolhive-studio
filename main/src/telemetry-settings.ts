import { readSetting } from './db/readers/settings-reader'
import log from './logger'

export function getIsTelemetryEnabled(): boolean {
  try {
    const value = readSetting('isTelemetryEnabled')
    if (value !== undefined) return value === 'true'
  } catch (err) {
    log.error('[DB] SQLite read failed (isTelemetryEnabled):', err)
  }
  return true
}
