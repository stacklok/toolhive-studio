import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { up as applyInitialSchema } from '../migrations/001-initial-schema'
import { up as applyMigration002 } from '../migrations/002-thread-title-flag'
import { up as applyMigration003 } from '../migrations/003-thread-starred'
import { up as applyMigration006 } from '../migrations/006-enabled-skills'
import { up as applyMigration007 } from '../migrations/007-per-thread-settings'
import { up as applyMigration008 } from '../migrations/008-thread-archived'
import { up as applyMigration009 } from '../migrations/009-thread-search'

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
      { thread_id: string | null } | undefined
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

describe('002-thread-title-flag migration', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    applyInitialSchema(db)
  })

  afterEach(() => {
    db.close()
  })

  it('adds the title_edited_by_user column to threads', () => {
    applyMigration002(db)
    const cols = db.prepare("PRAGMA table_info('threads')").all() as {
      name: string
    }[]
    const names = cols.map((c) => c.name)
    expect(names).toContain('title_edited_by_user')
  })

  it('defaults title_edited_by_user to 0 for existing rows', () => {
    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t1', 'Hello', 1000, 2000)"
    ).run()

    applyMigration002(db)

    const row = db
      .prepare('SELECT title_edited_by_user FROM threads WHERE id = ?')
      .get('t1') as { title_edited_by_user: number }
    expect(row.title_edited_by_user).toBe(0)
  })

  it('allows new rows to store title_edited_by_user = 1', () => {
    applyMigration002(db)
    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp, title_edited_by_user) VALUES ('t2', 'Hi', 1000, 2000, 1)"
    ).run()
    const row = db
      .prepare('SELECT title_edited_by_user FROM threads WHERE id = ?')
      .get('t2') as { title_edited_by_user: number }
    expect(row.title_edited_by_user).toBe(1)
  })
})

describe('003-thread-starred migration', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    applyInitialSchema(db)
  })

  afterEach(() => {
    db.close()
  })

  it('adds the starred column to threads', () => {
    applyMigration003(db)
    const cols = db.prepare("PRAGMA table_info('threads')").all() as {
      name: string
    }[]
    const names = cols.map((c) => c.name)
    expect(names).toContain('starred')
  })

  it('defaults starred to 0 for existing rows', () => {
    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t1', 'Hello', 1000, 2000)"
    ).run()

    applyMigration003(db)

    const row = db
      .prepare('SELECT starred FROM threads WHERE id = ?')
      .get('t1') as { starred: number }
    expect(row.starred).toBe(0)
  })

  it('allows new rows to store starred = 1', () => {
    applyMigration003(db)
    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp, starred) VALUES ('t2', 'Fav', 1000, 2000, 1)"
    ).run()
    const row = db
      .prepare('SELECT starred FROM threads WHERE id = ?')
      .get('t2') as { starred: number }
    expect(row.starred).toBe(1)
  })
})

describe('008-thread-archived migration', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    applyInitialSchema(db)
    applyMigration003(db)
  })

  afterEach(() => {
    db.close()
  })

  it('adds a nullable archived_at column that defaults to NULL', () => {
    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t1', 'Hello', 1000, 2000)"
    ).run()

    applyMigration008(db)

    const row = db
      .prepare('SELECT archived_at FROM threads WHERE id = ?')
      .get('t1') as { archived_at: number | null }
    expect(row.archived_at).toBeNull()
  })

  it('creates the sidebar index', () => {
    applyMigration008(db)
    const indexes = db.prepare("PRAGMA index_list('threads')").all() as {
      name: string
    }[]
    expect(indexes.map((i) => i.name)).toContain('idx_threads_sidebar')
  })

  it('serves the most-recent query without sorting', () => {
    applyMigration008(db)
    const plan = (
      db
        .prepare(
          `EXPLAIN QUERY PLAN SELECT id FROM threads WHERE archived_at IS NULL
           ORDER BY last_edit_timestamp DESC, id DESC LIMIT 1`
        )
        .all() as { detail: string }[]
    )
      .map((r) => r.detail)
      .join('\n')
    expect(plan).toContain('idx_threads_recent')
    expect(plan).not.toContain('TEMP B-TREE')
  })
})

describe('009-thread-search migration', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    applyInitialSchema(db)
  })

  afterEach(() => {
    db.close()
  })

  it('backfills the index from existing text parts only', () => {
    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t1', 'Deploy notes', 1000, 2000)"
    ).run()
    const insert = db.prepare(
      'INSERT INTO thread_messages (id, thread_id, role, parts, metadata, position) VALUES (?, ?, ?, ?, ?, ?)'
    )
    insert.run(
      'm1',
      't1',
      'user',
      JSON.stringify([{ type: 'text', text: 'rollback the canary' }]),
      '{}',
      0
    )
    insert.run(
      'm2',
      't1',
      'assistant',
      JSON.stringify([{ type: 'tool-x', output: 'secretoutput' }]),
      '{}',
      1
    )
    insert.run('m3', 't1', 'assistant', 'not json', '{}', 2)

    applyMigration009(db)

    const match = (q: string) =>
      db
        .prepare(
          'SELECT thread_id FROM thread_search WHERE thread_search MATCH ?'
        )
        .all(q)
    expect(match('canary')).toEqual([{ thread_id: 't1' }])
    expect(match('deploy')).toEqual([{ thread_id: 't1' }])
    expect(match('secretoutput')).toEqual([])
  })
})

describe('006-enabled-skills migration', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    applyInitialSchema(db)
  })

  afterEach(() => {
    db.close()
  })

  it('creates the enabled_skills table', () => {
    applyMigration006(db)
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all() as { name: string }[]
    expect(tables.map((t) => t.name)).toContain('enabled_skills')
  })

  it('enforces the name primary key', () => {
    applyMigration006(db)
    db.prepare("INSERT INTO enabled_skills (name) VALUES ('foo')").run()
    db.prepare(
      "INSERT OR IGNORE INTO enabled_skills (name) VALUES ('foo')"
    ).run()
    const rows = db.prepare('SELECT name FROM enabled_skills').all() as {
      name: string
    }[]
    expect(rows).toHaveLength(1)
    expect(rows[0]!.name).toBe('foo')
  })
})

describe('007-per-thread-settings migration', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    applyInitialSchema(db)
    applyMigration006(db)
  })

  afterEach(() => {
    db.close()
  })

  it('adds the per-thread settings columns to threads', () => {
    applyMigration007(db)
    const cols = db.prepare("PRAGMA table_info('threads')").all() as {
      name: string
    }[]
    const names = cols.map((c) => c.name)
    expect(names).toContain('selected_provider')
    expect(names).toContain('selected_model')
    expect(names).toContain('enabled_mcp_tools')
    expect(names).toContain('enabled_skills')
  })

  it('snapshots current globals into every existing thread row', () => {
    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t1', 'A', 1000, 1000)"
    ).run()
    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t2', 'B', 2000, 2000)"
    ).run()
    db.prepare(
      "INSERT INTO selected_model (id, provider, model) VALUES (1, 'openai', 'gpt-4o')"
    ).run()
    db.prepare(
      "INSERT INTO enabled_mcp_tools (server_name, tool_names) VALUES ('alpha', ?)"
    ).run(JSON.stringify(['t1', 't2']))
    db.prepare("INSERT INTO enabled_skills (name) VALUES ('skill-a')").run()
    db.prepare("INSERT INTO enabled_skills (name) VALUES ('skill-b')").run()

    applyMigration007(db)

    const rows = db
      .prepare(
        `SELECT id, selected_provider, selected_model,
                enabled_mcp_tools, enabled_skills
         FROM threads ORDER BY id`
      )
      .all() as {
      id: string
      selected_provider: string | null
      selected_model: string | null
      enabled_mcp_tools: string | null
      enabled_skills: string | null
    }[]
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.selected_provider).toBe('openai')
      expect(row.selected_model).toBe('gpt-4o')
      expect(JSON.parse(row.enabled_mcp_tools!)).toEqual({
        alpha: ['t1', 't2'],
      })
      expect(JSON.parse(row.enabled_skills!)).toEqual(['skill-a', 'skill-b'])
    }
  })

  it('writes NULL provider/model when no global selected_model row exists', () => {
    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t1', 'A', 1000, 1000)"
    ).run()

    applyMigration007(db)

    const row = db
      .prepare(
        `SELECT selected_provider, selected_model,
                enabled_mcp_tools, enabled_skills
         FROM threads WHERE id = 't1'`
      )
      .get() as {
      selected_provider: string | null
      selected_model: string | null
      enabled_mcp_tools: string | null
      enabled_skills: string | null
    }
    expect(row.selected_provider).toBeNull()
    expect(row.selected_model).toBeNull()
    // Tools and skills always snapshot as a JSON value, never NULL.
    expect(JSON.parse(row.enabled_mcp_tools!)).toEqual({})
    expect(JSON.parse(row.enabled_skills!)).toEqual([])
  })

  it('writes NULL provider/model when global row has empty strings', () => {
    db.prepare(
      "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t1', 'A', 1000, 1000)"
    ).run()
    db.prepare(
      "INSERT INTO selected_model (id, provider, model) VALUES (1, '', '')"
    ).run()

    applyMigration007(db)

    const row = db
      .prepare(
        `SELECT selected_provider, selected_model
         FROM threads WHERE id = 't1'`
      )
      .get() as {
      selected_provider: string | null
      selected_model: string | null
    }
    expect(row.selected_provider).toBeNull()
    expect(row.selected_model).toBeNull()
  })

  it('snapshots empty defaults when no threads exist', () => {
    applyMigration007(db)
    const count = db.prepare('SELECT COUNT(*) AS c FROM threads').get() as {
      c: number
    }
    expect(count.c).toBe(0)
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
