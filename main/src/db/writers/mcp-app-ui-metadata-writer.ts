import { getDb, isDbWritable } from '../database'
import { withDbSpan } from '../telemetry'

export interface McpAppUiMetadataEntry {
  resourceUri: string
  serverName: string
}

export function replaceAllMcpAppUiMetadata(
  entries: Record<string, McpAppUiMetadataEntry>
): void {
  if (!isDbWritable()) return
  const toolNames = Object.keys(entries)
  withDbSpan(
    'DB replace MCP App UI metadata',
    'db.write',
    { 'db.entry_count': toolNames.length },
    () => {
      const db = getDb()
      const now = Date.now()
      db.transaction(() => {
        db.prepare('DELETE FROM mcp_app_ui_metadata').run()
        const insert = db.prepare(
          `INSERT INTO mcp_app_ui_metadata (tool_name, server_name, resource_uri, updated_at)
           VALUES (?, ?, ?, ?)`
        )
        for (const toolName of toolNames) {
          const entry = entries[toolName]!
          insert.run(toolName, entry.serverName, entry.resourceUri, now)
        }
      })()
    }
  )
}

export function clearAllMcpAppUiMetadata(): void {
  if (!isDbWritable()) return
  withDbSpan('DB clear MCP App UI metadata', 'db.write', {}, () => {
    const db = getDb()
    db.prepare('DELETE FROM mcp_app_ui_metadata').run()
  })
}
