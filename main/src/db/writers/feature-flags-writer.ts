import { getDb, isDbWritable } from '../database'
import { withDbSpan } from '../telemetry'

export function writeFeatureFlag(key: string, enabled: boolean): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB write feature flag',
    'db.write',
    { 'db.flag_key': key },
    () => {
      const db = getDb()
      db.prepare(
        'INSERT OR REPLACE INTO feature_flags (key, enabled) VALUES (?, ?)'
      ).run(key, enabled ? 1 : 0)
    }
  )
}

export function deleteFeatureFlag(key: string): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB delete feature flag',
    'db.write',
    { 'db.flag_key': key },
    () => {
      const db = getDb()
      db.prepare('DELETE FROM feature_flags WHERE key = ?').run(key)
    }
  )
}
