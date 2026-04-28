import { getDb } from '../database'
import { withDbSpan } from '../telemetry'
import type {
  AgentConfig,
  AgentKind,
  BuiltinToolsKey,
} from '../../chat/agents/types'

interface DbAgent {
  id: string
  kind: string
  name: string
  description: string
  instructions: string
  default_provider: string | null
  default_model: string | null
  builtin_tools_key: string | null
  created_at: number
  updated_at: number
}

function hydrate(row: DbAgent): AgentConfig {
  const defaultModel =
    row.default_provider && row.default_model
      ? { provider: row.default_provider, model: row.default_model }
      : undefined

  return {
    id: row.id,
    kind: row.kind as AgentKind,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    ...(defaultModel ? { defaultModel } : {}),
    builtinToolsKey: (row.builtin_tools_key as BuiltinToolsKey | null) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function readAgent(id: string): AgentConfig | null {
  return withDbSpan('DB read agent', 'db.read', { 'db.agent_id': id }, () => {
    const db = getDb()
    const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as
      | DbAgent
      | undefined
    return row ? hydrate(row) : null
  })
}

export function readAllAgents(): AgentConfig[] {
  return withDbSpan('DB read all agents', 'db.read', {}, () => {
    const db = getDb()
    const rows = db
      .prepare('SELECT * FROM agents ORDER BY kind ASC, created_at ASC')
      .all() as DbAgent[]
    return rows.map(hydrate)
  })
}

export function readThreadAgentId(threadId: string): string | null {
  return withDbSpan(
    'DB read thread agent id',
    'db.read',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      const row = db
        .prepare('SELECT agent_id FROM threads WHERE id = ?')
        .get(threadId) as { agent_id: string | null } | undefined
      return row?.agent_id ?? null
    }
  )
}
