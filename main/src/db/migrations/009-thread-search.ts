import type Database from 'better-sqlite3'
import { extractSearchText } from '../thread-search-text'

export function up(db: Database.Database): void {
  db.exec(`
    -- Full-text index for playground chat search: one row per thread.
    -- title and body are weighted separately at query time (bm25).
    CREATE VIRTUAL TABLE thread_search USING fts5(
      thread_id UNINDEXED,
      title,
      body,
      tokenize = 'unicode61 remove_diacritics 2'
    );

    -- Keyed lookup from thread id to its FTS rowid. FTS5 can't index
    -- thread_id for equality, so without this every reindex (several per
    -- second while a reply streams) would scan the whole index.
    CREATE TABLE thread_search_ids (
      rowid INTEGER PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE
    );
  `)

  // Backfill from existing history.
  const threads = db.prepare('SELECT id, title FROM threads').all() as {
    id: string
    title: string | null
  }[]
  const selectParts = db.prepare(
    'SELECT parts FROM thread_messages WHERE thread_id = ? ORDER BY position'
  )
  const insertId = db.prepare(
    'INSERT INTO thread_search_ids (thread_id) VALUES (?)'
  )
  const insert = db.prepare(
    'INSERT INTO thread_search (rowid, thread_id, title, body) VALUES (?, ?, ?, ?)'
  )
  for (const thread of threads) {
    const rows = selectParts.all(thread.id) as { parts: string }[]
    const partsList = rows.map((row) => {
      try {
        return JSON.parse(row.parts) as unknown
      } catch {
        return null
      }
    })
    const rowid = insertId.run(thread.id).lastInsertRowid
    insert.run(
      rowid,
      thread.id,
      thread.title ?? '',
      extractSearchText(partsList)
    )
  }
}
