import { getDb } from '../database'
import type { ChatSettingsThread } from '../../chat/threads-storage'

interface DbThread {
  id: string
  title: string | null
  created_at: number
  last_edit_timestamp: number
}

interface DbMessage {
  id: string
  thread_id: string
  role: string
  parts: string
  metadata: string | null
  position: number
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
  const db = getDb()
  const row = db.prepare('SELECT * FROM threads WHERE id = ?').get(threadId) as
    | DbThread
    | undefined
  if (!row) return null
  return hydrateThread(row)
}

export function readAllThreads(): ChatSettingsThread[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM threads ORDER BY last_edit_timestamp DESC')
    .all() as DbThread[]
  return rows.map(hydrateThread)
}

export function readActiveThreadId(): string | undefined {
  const db = getDb()
  const row = db
    .prepare('SELECT thread_id FROM active_thread WHERE id = 1')
    .get() as { thread_id: string | null } | undefined
  return row?.thread_id ?? undefined
}

export function readThreadCount(): number {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM threads').get() as {
    count: number
  }
  return row.count
}
