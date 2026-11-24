import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    -- When the user archived the thread (ms epoch). NULL = not archived.
    -- Independent of 'starred': unarchiving restores the thread to whichever
    -- sidebar section it came from.
    ALTER TABLE threads ADD COLUMN archived_at INTEGER;

    -- Serves the sidebar queries: unarchived threads, split by starred,
    -- ordered most-recent first and paged by (last_edit_timestamp, id).
    CREATE INDEX idx_threads_sidebar
      ON threads(archived_at, starred, last_edit_timestamp DESC, id DESC);

    -- Same, across both sections: the most recent unarchived threads with no
    -- starred filter (index redirect, search dialog's recent list). Without
    -- it SQLite sorts every unarchived thread to return the top few.
    CREATE INDEX idx_threads_recent
      ON threads(archived_at, last_edit_timestamp DESC, id DESC);
  `)
}
