import { getDb } from '../database'
import { decryptSecret } from '../encryption'

interface DbAiProvider {
  provider_id: string
  api_key_enc: Buffer | null
  endpoint_url_enc: Buffer | null
}

export function readChatProvider(providerId: string): {
  providerId: string
  apiKey?: string
  endpointURL?: string
} | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM ai_providers WHERE provider_id = ?')
    .get(providerId) as DbAiProvider | undefined
  if (!row) return null

  return {
    providerId: row.provider_id,
    ...(row.api_key_enc ? { apiKey: decryptSecret(row.api_key_enc) } : {}),
    ...(row.endpoint_url_enc
      ? { endpointURL: decryptSecret(row.endpoint_url_enc) }
      : {}),
  }
}

export function readAllProviders(): Map<
  string,
  {
    providerId: string
    apiKey?: string
    endpointURL?: string
  }
> {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM ai_providers').all() as DbAiProvider[]
  const result = new Map<
    string,
    {
      providerId: string
      apiKey?: string
      endpointURL?: string
    }
  >()

  for (const row of rows) {
    result.set(row.provider_id, {
      providerId: row.provider_id,
      ...(row.api_key_enc ? { apiKey: decryptSecret(row.api_key_enc) } : {}),
      ...(row.endpoint_url_enc
        ? { endpointURL: decryptSecret(row.endpoint_url_enc) }
        : {}),
    })
  }

  return result
}

export function readSelectedModel(): { provider: string; model: string } {
  const db = getDb()
  const row = db
    .prepare('SELECT provider, model FROM selected_model WHERE id = 1')
    .get() as { provider: string; model: string } | undefined
  return row ?? { provider: '', model: '' }
}

export function readEnabledMcpTools(): Record<string, string[]> {
  const db = getDb()
  const rows = db
    .prepare('SELECT server_name, tool_names FROM enabled_mcp_tools')
    .all() as {
    server_name: string
    tool_names: string
  }[]

  const result: Record<string, string[]> = {}
  for (const row of rows) {
    result[row.server_name] = JSON.parse(row.tool_names)
  }
  return result
}
