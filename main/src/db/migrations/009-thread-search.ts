import type Database from 'better-sqlite3'

/**
 * Frozen copy of the text extraction as of this migration: only `text`
 * parts, joined with newlines. Deliberately not imported from app code, so
 * every user who runs 009 gets the same backfill even if the live
 * extraction (`thread-search-text.ts`) changes later.
 */
function extractTextParts(partsList: unknown[]): string {
  const chunks: string[] = []
  for (const parts of partsList) {
    if (!Array.isArray(parts)) continue
    for (const part of parts) {
      if (
        part &&
        typeof part === 'object' &&
        (part as { type?: unknown }).type === 'text' &&
        typeof (part as { text?: unknown }).text === 'string'
      ) {
        chunks.push((part as { text: string }).text)
      }
    }
  }
  return chunks.join('\n')
}

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
      extractTextParts(partsList)
    )
  }
}
