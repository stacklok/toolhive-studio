import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { up as applyInitialSchema } from '../migrations/001-initial-schema'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => ':memory:') },
}))

vi.mock('../../logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('001-initial-schema', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
  })

  afterEach(() => {
    db.close()
  })

  it('creates all expected tables', () => {
    applyInitialSchema(db)

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all() as { name: string }[]
    const tableNames = tables.map((t) => t.name)

    expect(tableNames).toContain('settings')
    expect(tableNames).toContain('feature_flags')
    expect(tableNames).toContain('ai_providers')
    expect(tableNames).toContain('selected_model')
    expect(tableNames).toContain('enabled_mcp_tools')
    expect(tableNames).toContain('threads')
    expect(tableNames).toContain('active_thread')
    expect(tableNames).toContain('thread_messages')
    expect(tableNames).toContain('shutdown_servers')
  })

  it('enforces settings primary key', () => {
    applyInitialSchema(db)

    db.prepare("INSERT INTO settings (key, value) VALUES ('k1', 'v1')").run()
    db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('k1', 'v2')"
    ).run()

    const rows = db.prepare('SELECT * FROM settings').all()
    expect(rows).toHaveLength(1)
  })

  it('enforces selected_model singleton constraint', () => {
    applyInitialSchema(db)

    db.prepare(
      "INSERT INTO selected_model (id, provider, model) VALUES (1, 'p1', 'm1')"
    ).run()

    expect(() => {
      db.prepare(
        "INSERT INTO selected_model (id, provider, model) VALUES (2, 'p2', 'm2')"
      ).run()
    }).toThrow()
  })

  it('cascades thread_messages deletion when thread is deleted', () => {
    applyInitialSchema(db)

    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t1', 'Thread 1', 1000, 1000)"
    ).run()
    db.prepare(
      "INSERT INTO thread_messages (id, thread_id, role, parts, position) VALUES ('m1', 't1', 'user', '[]', 0)"
    ).run()
    db.prepare(
      "INSERT INTO thread_messages (id, thread_id, role, parts, position) VALUES ('m2', 't1', 'assistant', '[]', 1)"
    ).run()

    db.prepare("DELETE FROM threads WHERE id = 't1'").run()

    const messages = db.prepare('SELECT * FROM thread_messages').all()
    expect(messages).toHaveLength(0)
  })

  it('sets active_thread.thread_id to NULL when referenced thread is deleted', () => {
    applyInitialSchema(db)

    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t1', 'Thread 1', 1000, 1000)"
    ).run()
    db.prepare(
      "INSERT INTO active_thread (id, thread_id) VALUES (1, 't1')"
    ).run()

    db.prepare("DELETE FROM threads WHERE id = 't1'").run()

    const row = db.prepare('SELECT * FROM active_thread WHERE id = 1').get() as
      | { thread_id: string | null }
      | undefined
    expect(row?.thread_id).toBeNull()
  })

  it('creates index on thread_messages.thread_id', () => {
    applyInitialSchema(db)

    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='thread_messages'"
      )
      .all() as { name: string }[]
    const indexNames = indexes.map((i) => i.name)
    expect(indexNames).toContain('idx_thread_messages_thread')
  })

  it('stores BLOBs in ai_providers', () => {
    applyInitialSchema(db)

    const apiKeyBuf = Buffer.from('secret-key')
    const endpointBuf = Buffer.from('https://example.com')

    db.prepare(
      'INSERT INTO ai_providers (provider_id, api_key_enc, endpoint_url_enc) VALUES (?, ?, ?)'
    ).run('provider1', apiKeyBuf, endpointBuf)

    const row = db
      .prepare('SELECT * FROM ai_providers WHERE provider_id = ?')
      .get('provider1') as {
      api_key_enc: Buffer
      endpoint_url_enc: Buffer
    }

    expect(Buffer.isBuffer(row.api_key_enc)).toBe(true)
    expect(row.api_key_enc.toString()).toBe('secret-key')
    expect(row.endpoint_url_enc.toString()).toBe('https://example.com')
  })
})

describe('migrator', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
  })

  afterEach(() => {
    db.close()
  })

  it('runs migrations and tracks them', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    applyInitialSchema(db)
    db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(
      1,
      '001-initial-schema'
    )

    const applied = db.prepare('SELECT * FROM migrations').all() as {
      id: number
      name: string
    }[]
    expect(applied).toHaveLength(1)
    expect(applied[0]!.name).toBe('001-initial-schema')
    expect(applied[0]!.id).toBe(1)
  })

  it('throws when schema is applied twice (no IF NOT EXISTS)', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(
      1,
      '001-initial-schema'
    )
    applyInitialSchema(db)

    expect(() => applyInitialSchema(db)).toThrow()
  })
})
