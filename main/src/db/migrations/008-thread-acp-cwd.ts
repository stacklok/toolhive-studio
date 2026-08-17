import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    -- Working directory for ACP-based providers (e.g. the Cursor CLI agent),
    -- per thread. Nullable; NULL means "not set" and callers fall back to
    -- the user's home directory.
    ALTER TABLE threads ADD COLUMN acp_cwd TEXT;
  `)
}
