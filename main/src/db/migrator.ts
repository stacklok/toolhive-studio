import type Database from 'better-sqlite3'
import { getDb, setDbWritable } from './database'
import log from '../logger'
import { withDbSpan } from './telemetry'

interface Migration {
  id: number
  name: string
  up: (db: Database.Database) => void
}

import * as m001 from './migrations/001-initial-schema'
import * as m002 from './migrations/002-thread-title-flag'
import * as m003 from './migrations/003-thread-starred'
import * as m004 from './migrations/004-mcp-app-ui-metadata'

const migrations: Migration[] = [
  { id: 1, name: '001-initial-schema', up: m001.up },
  { id: 2, name: '002-thread-title-flag', up: m002.up },
  { id: 3, name: '003-thread-starred', up: m003.up },
  { id: 4, name: '004-mcp-app-ui-metadata', up: m004.up },
]

export function runMigrations(): void {
  withDbSpan(
    'DB migrations',
    'db.migrate',
    { 'db.migration_count': migrations.length },
    () => {
      const db = getDb()

      db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

      const applied = new Set(
        (db.prepare('SELECT id FROM migrations').all() as { id: number }[]).map(
          (row) => row.id
        )
      )

      const highestApplied = Math.max(0, ...applied)
      const highestKnown =
        migrations.length > 0 ? migrations[migrations.length - 1]!.id : 0

      if (highestApplied > highestKnown) {
        log.warn(
          `[DB] Database schema (v${highestApplied}) is newer than app (v${highestKnown}). ` +
            'Skipping SQLite writes to avoid corruption.'
        )
        setDbWritable(false)
        return
      }

      for (const migration of migrations) {
        if (applied.has(migration.id)) continue

        log.info(`[DB] Running migration: ${migration.name}`)
        db.transaction(() => {
          migration.up(db)
          db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(
            migration.id,
            migration.name
          )
        })()
        log.info(`[DB] Migration applied: ${migration.name}`)
      }
    }
  )
}
