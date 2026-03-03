import { getDb } from '../database'
import { withDbSpan } from '../telemetry'

export function readFeatureFlag(key: string): boolean | undefined {
  return withDbSpan(
    'DB read feature flag',
    'db.read',
    { 'db.flag_key': key },
    () => {
      const db = getDb()
      const row = db
        .prepare('SELECT enabled FROM feature_flags WHERE key = ?')
        .get(key) as { enabled: number } | undefined
      if (!row) return undefined
      return row.enabled === 1
    }
  )
}
