import Database from 'better-sqlite3'
import { up as applyInitialSchema } from '../migrations/001-initial-schema'
import { up as applyMigration002 } from '../migrations/002-thread-title-flag'
import { up as applyMigration003 } from '../migrations/003-thread-starred'
import { up as applyMigration004 } from '../migrations/004-mcp-app-ui-metadata'

/**
 * Creates a fresh in-memory SQLite database with the full schema applied,
 * including all migrations. Use in tests to get a clean DB for each test case.
 */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  applyInitialSchema(db)
  applyMigration002(db)
  applyMigration003(db)
  applyMigration004(db)
  return db
}
