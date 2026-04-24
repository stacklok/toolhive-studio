import { getDb, isDbWritable } from '../database'
import { withDbSpan } from '../telemetry'
import type { AgentConfig } from '../../chat/agents/types'

export function writeAgent(agent: AgentConfig): void {
  if (!isDbWritable()) return
  withDbSpan('DB write agent', 'db.write', { 'db.agent_id': agent.id }, () => {
    const db = getDb()
    db.prepare(
      `INSERT OR REPLACE INTO agents (
           id, kind, name, description, instructions,
           default_provider, default_model, builtin_tools_key,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      agent.id,
      agent.kind,
      agent.name,
      agent.description,
      agent.instructions,
      agent.defaultModel?.provider ?? null,
      agent.defaultModel?.model ?? null,
      agent.builtinToolsKey ?? null,
      agent.createdAt,
      agent.updatedAt
    )
  })
}

export function deleteAgentFromDb(id: string): void {
  if (!isDbWritable()) return
  withDbSpan('DB delete agent', 'db.write', { 'db.agent_id': id }, () => {
    const db = getDb()
    db.prepare('DELETE FROM agents WHERE id = ?').run(id)
  })
}

export function writeThreadAgentId(
  threadId: string,
  agentId: string | null
): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB write thread agent id',
    'db.write',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      db.prepare('UPDATE threads SET agent_id = ? WHERE id = ?').run(
        agentId,
        threadId
      )
    }
  )
}
