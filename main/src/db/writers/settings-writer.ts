import { getDb, isDbWritable } from '../database'
import log from '../../logger'
import { withDbSpan } from '../telemetry'

export function writeSetting(key: string, value: string): void {
  if (!isDbWritable()) return
  try {
    withDbSpan('DB write setting', 'db.write', { 'db.key': key }, () => {
      const db = getDb()
      db.prepare(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
      ).run(key, value)
    })
  } catch (err) {
    log.error(`[DB] Failed to write setting ${key}:`, err)
  }
}

export function deleteSetting(key: string): void {
  if (!isDbWritable()) return
  try {
    withDbSpan('DB delete setting', 'db.write', { 'db.key': key }, () => {
      const db = getDb()
      db.prepare('DELETE FROM settings WHERE key = ?').run(key)
    })
  } catch (err) {
    log.error(`[DB] Failed to delete setting ${key}:`, err)
  }
}
