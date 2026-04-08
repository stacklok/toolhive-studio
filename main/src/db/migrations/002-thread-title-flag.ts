import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    ALTER TABLE threads ADD COLUMN title_edited_by_user INTEGER NOT NULL DEFAULT 0;
  `)
}
