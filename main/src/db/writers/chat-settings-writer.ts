import { getDb, isDbWritable } from '../database'
import { encryptSecret } from '../encryption'
import { withDbSpan } from '../telemetry'

export function writeProvider(
  providerId: string,
  options: {
    apiKey?: string
    endpointURL?: string
  }
): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB write provider',
    'db.write',
    { 'db.provider_id': providerId },
    () => {
      const db = getDb()
      const apiKeyEnc = options.apiKey ? encryptSecret(options.apiKey) : null
      const endpointUrlEnc = options.endpointURL
        ? encryptSecret(options.endpointURL)
        : null

      db.prepare(
        `INSERT OR REPLACE INTO ai_providers (provider_id, api_key_enc, endpoint_url_enc)
       VALUES (?, ?, ?)`
      ).run(providerId, apiKeyEnc, endpointUrlEnc)
    }
  )
}

export function deleteProvider(providerId: string): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB delete provider',
    'db.write',
    { 'db.provider_id': providerId },
    () => {
      const db = getDb()
      db.prepare('DELETE FROM ai_providers WHERE provider_id = ?').run(
        providerId
      )
    }
  )
}

export function clearAllProviders(): void {
  if (!isDbWritable()) return
  withDbSpan('DB clear all providers', 'db.write', {}, () => {
    const db = getDb()
    db.prepare('DELETE FROM ai_providers').run()
  })
}

export function writeSelectedModel(provider: string, model: string): void {
  if (!isDbWritable()) return
  withDbSpan('DB write selected model', 'db.write', {}, () => {
    const db = getDb()
    db.prepare(
      `INSERT OR REPLACE INTO selected_model (id, provider, model) VALUES (1, ?, ?)`
    ).run(provider, model)
  })
}

export function writeEnabledMcpTools(
  serverName: string,
  toolNames: string[]
): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB write enabled MCP tools',
    'db.write',
    { 'db.server_name': serverName },
    () => {
      const db = getDb()
      db.prepare(
        `INSERT OR REPLACE INTO enabled_mcp_tools (server_name, tool_names) VALUES (?, ?)`
      ).run(serverName, JSON.stringify(toolNames))
    }
  )
}

export function deleteEnabledMcpTools(serverName: string): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB delete enabled MCP tools',
    'db.write',
    { 'db.server_name': serverName },
    () => {
      const db = getDb()
      db.prepare('DELETE FROM enabled_mcp_tools WHERE server_name = ?').run(
        serverName
      )
    }
  )
}
