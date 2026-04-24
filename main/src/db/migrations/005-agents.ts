import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    -- Agent configurations (system prompts, optional default model, built-in tool bundles)
    CREATE TABLE agents (
      id                  TEXT PRIMARY KEY,
      kind                TEXT NOT NULL CHECK (kind IN ('builtin', 'custom')),
      name                TEXT NOT NULL,
      description         TEXT NOT NULL DEFAULT '',
      instructions        TEXT NOT NULL,
      default_provider    TEXT,
      default_model       TEXT,
      builtin_tools_key   TEXT,
      created_at          INTEGER NOT NULL,
      updated_at          INTEGER NOT NULL
    );

    -- Per-thread agent selection (nullable; falls back to default built-in)
    ALTER TABLE threads ADD COLUMN agent_id TEXT;
  `)
}
