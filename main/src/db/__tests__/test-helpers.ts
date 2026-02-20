import Database from 'better-sqlite3'
import { up as applyInitialSchema } from '../migrations/001-initial-schema'

/**
 * Creates a fresh in-memory SQLite database with the full schema applied.
 * Use in tests to get a clean DB for each test case.
 */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  applyInitialSchema(db)
  return db
}
