import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    -- Tool UI metadata cache for MCP Apps (tool name -> server + resource URI).
    -- Mirrors the in-memory cache built by createMcpTools() so historical
    -- tool calls can render their MCP App iframes after an app restart
    -- without first requiring a new chat stream to repopulate the cache.
    CREATE TABLE mcp_app_ui_metadata (
      tool_name    TEXT PRIMARY KEY,
      server_name  TEXT NOT NULL,
      resource_uri TEXT NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE INDEX idx_mcp_app_ui_metadata_server
      ON mcp_app_ui_metadata(server_name);
  `)
}
