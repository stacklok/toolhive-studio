import { getDb } from '../database'

export function readSetting(key: string): string | undefined {
  const db = getDb()
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined
  return row?.value
}
