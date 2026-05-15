import type Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  db.exec(`
    -- Per-thread selection of model, MCP tools, and skills.
    -- Nullable; NULL means "no override, fall back to global".
    -- After the snapshot below, every existing thread has non-NULL values,
    -- so the fallback path only matters for edge cases (manually cleared).
    ALTER TABLE threads ADD COLUMN selected_provider TEXT;
    ALTER TABLE threads ADD COLUMN selected_model TEXT;
    ALTER TABLE threads ADD COLUMN enabled_mcp_tools TEXT;
    ALTER TABLE threads ADD COLUMN enabled_skills TEXT;
  `)

  const selectedModel = db
    .prepare('SELECT provider, model FROM selected_model WHERE id = 1')
    .get() as { provider: string; model: string } | undefined

  const mcpRows = db
    .prepare('SELECT server_name, tool_names FROM enabled_mcp_tools')
    .all() as { server_name: string; tool_names: string }[]
  const mcpSnapshot: Record<string, string[]> = {}
  for (const row of mcpRows) {
    try {
      mcpSnapshot[row.server_name] = JSON.parse(row.tool_names)
    } catch {
      mcpSnapshot[row.server_name] = []
    }
  }

  const skillRows = db
    .prepare('SELECT name FROM enabled_skills ORDER BY name')
    .all() as { name: string }[]
  const skillSnapshot = skillRows.map((r) => r.name)

  db.prepare(
    `UPDATE threads SET
       selected_provider = ?,
       selected_model = ?,
       enabled_mcp_tools = ?,
       enabled_skills = ?`
  ).run(
    selectedModel?.provider || null,
    selectedModel?.model || null,
    JSON.stringify(mcpSnapshot),
    JSON.stringify(skillSnapshot)
  )
}
