import { getDb } from '../database'
import { withDbSpan } from '../telemetry'
import type { McpAppUiMetadataEntry } from '../writers/mcp-app-ui-metadata-writer'

export function readAllMcpAppUiMetadata(): Record<
  string,
  McpAppUiMetadataEntry
> {
  return withDbSpan('DB read MCP App UI metadata', 'db.read', {}, () => {
    const db = getDb()
    const rows = db
      .prepare(
        'SELECT tool_name, server_name, resource_uri FROM mcp_app_ui_metadata'
      )
      .all() as {
      tool_name: string
      server_name: string
      resource_uri: string
    }[]
    const result: Record<string, McpAppUiMetadataEntry> = {}
    for (const row of rows) {
      result[row.tool_name] = {
        serverName: row.server_name,
        resourceUri: row.resource_uri,
      }
    }
    return result
  })
}
