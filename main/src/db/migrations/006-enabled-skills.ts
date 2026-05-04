import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    -- Set of user-scope skills the chat toolbar has enabled.
    -- Presence of a row = enabled; absence = disabled.
    CREATE TABLE enabled_skills (
      name TEXT PRIMARY KEY
    );
  `)
}
