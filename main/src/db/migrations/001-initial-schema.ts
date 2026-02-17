import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    -- Generic key-value settings (telemetry, auto-update, quit-confirmation)
    CREATE TABLE settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Feature flags
    CREATE TABLE feature_flags (
      key     TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0
    );

    -- AI providers (secrets encrypted via AES-256-GCM, stored as BLOBs)
    CREATE TABLE ai_providers (
      provider_id      TEXT PRIMARY KEY,
      api_key_enc      BLOB,
      endpoint_url_enc BLOB
    );

    -- Selected chat model (singleton row)
    CREATE TABLE selected_model (
      id       INTEGER PRIMARY KEY CHECK (id = 1),
      provider TEXT NOT NULL DEFAULT '',
      model    TEXT NOT NULL DEFAULT ''
    );

    -- Enabled MCP tools per server
    CREATE TABLE enabled_mcp_tools (
      server_name TEXT PRIMARY KEY,
      tool_names  TEXT NOT NULL DEFAULT '[]'
    );

    -- Chat threads
    CREATE TABLE threads (
      id                  TEXT PRIMARY KEY,
      title               TEXT,
      created_at          INTEGER NOT NULL,
      last_edit_timestamp INTEGER NOT NULL
    );

    -- Active thread (singleton row)
    CREATE TABLE active_thread (
      id        INTEGER PRIMARY KEY CHECK (id = 1),
      thread_id TEXT REFERENCES threads(id) ON DELETE SET NULL
    );

    -- Thread messages (normalized, one row per message)
    CREATE TABLE thread_messages (
      id        TEXT NOT NULL,
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      role      TEXT NOT NULL,
      parts     TEXT NOT NULL,
      metadata  TEXT,
      position  INTEGER NOT NULL,
      PRIMARY KEY (thread_id, position)
    );
    CREATE INDEX idx_thread_messages_thread ON thread_messages(thread_id);

    -- Shutdown servers snapshot
    CREATE TABLE shutdown_servers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      server_data TEXT NOT NULL
    );
  `)
}
