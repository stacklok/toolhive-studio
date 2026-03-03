import { getDb } from '../database'

export function readFeatureFlag(key: string): boolean | undefined {
  const db = getDb()
  const row = db
    .prepare('SELECT enabled FROM feature_flags WHERE key = ?')
    .get(key) as { enabled: number } | undefined
  if (!row) return undefined
  return row.enabled === 1
}
