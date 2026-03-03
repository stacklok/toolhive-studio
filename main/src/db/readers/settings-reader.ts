import { getDb } from '../database'
import { withDbSpan } from '../telemetry'

export function readSetting(key: string): string | undefined {
  return withDbSpan('DB read setting', 'db.read', { 'db.key': key }, () => {
    const db = getDb()
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(key) as { value: string } | undefined
    return row?.value
  })
}
