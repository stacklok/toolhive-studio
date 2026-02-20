import { getDb, isDbWritable } from '../database'
import log from '../../logger'

export function writeFeatureFlag(key: string, enabled: boolean): void {
  if (!isDbWritable()) return
  try {
    const db = getDb()
    db.prepare(
      'INSERT OR REPLACE INTO feature_flags (key, enabled) VALUES (?, ?)'
    ).run(key, enabled ? 1 : 0)
  } catch (err) {
    log.error(`[DB] Failed to write feature flag ${key}:`, err)
  }
}

export function deleteFeatureFlag(key: string): void {
  if (!isDbWritable()) return
  try {
    const db = getDb()
    db.prepare('DELETE FROM feature_flags WHERE key = ?').run(key)
  } catch (err) {
    log.error(`[DB] Failed to delete feature flag ${key}:`, err)
  }
}
