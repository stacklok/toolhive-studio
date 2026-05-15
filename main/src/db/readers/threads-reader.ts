import { getDb } from '../database'
import { withDbSpan } from '../telemetry'
import type { ChatSettingsThread } from '../../chat/threads-storage'

interface DbThread {
  id: string
  title: string | null
  created_at: number
  last_edit_timestamp: number
  title_edited_by_user: number
  starred: number
  agent_id: string | null
  selected_provider: string | null
  selected_model: string | null
  enabled_mcp_tools: string | null
  enabled_skills: string | null
}

interface DbMessage {
  id: string
  thread_id: string
  role: string
  parts: string
  metadata: string | null
  position: number
}

function parseMcpTools(raw: string | null): Record<string, string[]> | null {
  if (raw == null) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function parseSkills(raw: string | null): string[] | null {
  if (raw == null) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function hydrateThread(row: DbThread): ChatSettingsThread {
  const db = getDb()
  const messages = db
    .prepare(
      'SELECT * FROM thread_messages WHERE thread_id = ? ORDER BY position'
    )
    .all(row.id) as DbMessage[]

  return {
    id: row.id,
    title: row.title ?? undefined,
    titleEditedByUser: row.title_edited_by_user === 1,
    starred: row.starred === 1,
    agentId: row.agent_id ?? null,
    selectedProvider: row.selected_provider ?? null,
    selectedModel: row.selected_model ?? null,
    enabledMcpTools: parseMcpTools(row.enabled_mcp_tools),
    enabledSkills: parseSkills(row.enabled_skills),
    createdAt: row.created_at,
    lastEditTimestamp: row.last_edit_timestamp,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system' | 'data',
      parts: JSON.parse(m.parts),
      ...JSON.parse(m.metadata || '{}'),
    })),
  }
}

export function readThread(threadId: string): ChatSettingsThread | null {
  return withDbSpan(
    'DB read thread',
    'db.read',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      const row = db
        .prepare('SELECT * FROM threads WHERE id = ?')
        .get(threadId) as DbThread | undefined
      if (!row) return null
      return hydrateThread(row)
    }
  )
}

export function readAllThreads(): ChatSettingsThread[] {
  return withDbSpan('DB read all threads', 'db.read', {}, () => {
    const db = getDb()
    const rows = db
      .prepare('SELECT * FROM threads ORDER BY last_edit_timestamp DESC')
      .all() as DbThread[]
    return rows.map(hydrateThread)
  })
}

export function readActiveThreadId(): string | undefined {
  return withDbSpan('DB read active thread', 'db.read', {}, () => {
    const db = getDb()
    const row = db
      .prepare('SELECT thread_id FROM active_thread WHERE id = 1')
      .get() as { thread_id: string | null } | undefined
    return row?.thread_id ?? undefined
  })
}

export function readThreadCount(): number {
  return withDbSpan('DB read thread count', 'db.read', {}, () => {
    const db = getDb()
    const row = db.prepare('SELECT COUNT(*) as count FROM threads').get() as {
      count: number
    }
    return row.count
  })
}

export function readThreadSelectedModel(
  threadId: string
): { provider: string; model: string } | null {
  return withDbSpan(
    'DB read thread selected model',
    'db.read',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      const row = db
        .prepare(
          'SELECT selected_provider, selected_model FROM threads WHERE id = ?'
        )
        .get(threadId) as
        | { selected_provider: string | null; selected_model: string | null }
        | undefined
      if (!row) return null
      if (!row.selected_provider || !row.selected_model) return null
      return { provider: row.selected_provider, model: row.selected_model }
    }
  )
}

export function readThreadEnabledMcpTools(
  threadId: string
): Record<string, string[]> {
  return withDbSpan(
    'DB read thread enabled MCP tools',
    'db.read',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      const row = db
        .prepare('SELECT enabled_mcp_tools FROM threads WHERE id = ?')
        .get(threadId) as { enabled_mcp_tools: string | null } | undefined
      const parsed = parseMcpTools(row?.enabled_mcp_tools ?? null)
      return parsed ?? {}
    }
  )
}

export function readThreadEnabledSkills(threadId: string): string[] {
  return withDbSpan(
    'DB read thread enabled skills',
    'db.read',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      const row = db
        .prepare('SELECT enabled_skills FROM threads WHERE id = ?')
        .get(threadId) as { enabled_skills: string | null } | undefined
      const parsed = parseSkills(row?.enabled_skills ?? null)
      return parsed ?? []
    }
  )
}
