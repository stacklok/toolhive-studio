import { getDb, isDbWritable } from '../database'
import { withDbSpan } from '../telemetry'

export function writeSetting(key: string, value: string): void {
  if (!isDbWritable()) return
  withDbSpan('DB write setting', 'db.write', { 'db.key': key }, () => {
    const db = getDb()
    db.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    ).run(key, value)
  })
}

export function deleteSetting(key: string): void {
  if (!isDbWritable()) return
  withDbSpan('DB delete setting', 'db.write', { 'db.key': key }, () => {
    const db = getDb()
    db.prepare('DELETE FROM settings WHERE key = ?').run(key)
  })
}
