import { getDb } from '../database'
import { withDbSpan } from '../telemetry'
import type { ChatSettingsThread } from '../../chat/threads-storage'
import {
  SEARCH_HIGHLIGHT_END,
  SEARCH_HIGHLIGHT_START,
} from '@common/chat/thread-search'
import type {
  ListThreadsOptions,
  ThreadPage,
  ThreadSearchResult,
  ThreadSummary,
} from '../../chat/threads/types'

interface DbThread {
  id: string
  title: string | null
  created_at: number
  last_edit_timestamp: number
  title_edited_by_user: number
  starred: number
  archived_at: number | null
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
    archivedAt: row.archived_at ?? null,
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

interface DbThreadSummary {
  id: string
  title: string | null
  starred: number
  created_at: number
  last_edit_timestamp: number
  archived_at: number | null
}

const SUMMARY_COLUMNS =
  'id, title, starred, created_at, last_edit_timestamp, archived_at'

/** Upper bound for a single page, so a bad IPC argument can't ask for all. */
const MAX_PAGE_SIZE = 500

function toSummary(row: DbThreadSummary): ThreadSummary {
  return {
    id: row.id,
    title: row.title ?? undefined,
    starred: row.starred === 1,
    createdAt: row.created_at,
    lastEditTimestamp: row.last_edit_timestamp,
    archivedAt: row.archived_at ?? null,
  }
}

/**
 * Reads thread metadata only — no `thread_messages` access, no JSON parsing.
 * Ordered most-recent first (by `archived_at` for the archived list) and
 * paged with a keyset cursor.
 */
export function readThreadSummaries(
  options: ListThreadsOptions = {}
): ThreadPage {
  const archived = options.archived === true
  return withDbSpan(
    'DB read thread summaries',
    'db.read',
    { 'db.archived': archived },
    () => {
      const db = getDb()
      const sortKey = archived ? 'archived_at' : 'last_edit_timestamp'
      const where: string[] = [
        archived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL',
      ]
      const params: (string | number)[] = []

      if (options.starred !== undefined) {
        where.push('starred = ?')
        params.push(options.starred ? 1 : 0)
      }
      if (options.cursor) {
        where.push(`(${sortKey} < ? OR (${sortKey} = ? AND id < ?))`)
        params.push(options.cursor.ts, options.cursor.ts, options.cursor.id)
      }

      const limit =
        options.limit !== undefined
          ? Math.min(Math.max(1, Math.floor(options.limit)), MAX_PAGE_SIZE)
          : undefined
      // Fetch one extra row to know whether another page exists.
      const limitClause = limit !== undefined ? 'LIMIT ?' : ''
      if (limit !== undefined) params.push(limit + 1)

      const rows = db
        .prepare(
          `SELECT ${SUMMARY_COLUMNS}
           FROM threads
           WHERE ${where.join(' AND ')}
           ORDER BY ${sortKey} DESC, id DESC
           ${limitClause}`
        )
        .all(...params) as DbThreadSummary[]

      const hasMore = limit !== undefined && rows.length > limit
      const page = hasMore ? rows.slice(0, limit) : rows
      const last = page[page.length - 1]
      return {
        threads: page.map(toSummary),
        nextCursor:
          hasMore && last
            ? {
                ts: archived ? last.archived_at! : last.last_edit_timestamp,
                id: last.id,
              }
            : null,
      }
    }
  )
}

/**
 * Turns free text into a safe FTS5 query: every whitespace-separated token
 * becomes a quoted prefix term (`"foo"*`), ANDed together. Quoting means
 * user input can never be parsed as FTS syntax (NEAR, column filters, `-`).
 * Returns null when there is nothing searchable.
 */
export function toFtsQuery(input: string): string | null {
  const terms = input
    .split(/\s+/)
    .map((token) => token.replace(/"/g, '""'))
    .filter((token) => /[\p{L}\p{N}]/u.test(token))
    .map((token) => `"${token}"*`)
  return terms.length > 0 ? terms.join(' ') : null
}

const SEARCH_RESULT_LIMIT = 20

/**
 * Full-text search over thread titles and message text, archived threads
 * included. Ranked by bm25 with titles weighted 10x over message bodies.
 */
export function searchThreads(query: string): ThreadSearchResult[] {
  return withDbSpan('DB search threads', 'db.read', {}, () => {
    const match = toFtsQuery(query)
    if (!match) return []
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT t.id, t.title, t.starred, t.created_at,
                t.last_edit_timestamp, t.archived_at,
                snippet(thread_search, 2, ?, ?, '…', 16) AS snippet
         FROM thread_search
         JOIN threads t ON t.id = thread_search.thread_id
         WHERE thread_search MATCH ?
         ORDER BY bm25(thread_search, 0.0, 10.0, 1.0), t.last_edit_timestamp DESC
         LIMIT ?`
      )
      .all(
        SEARCH_HIGHLIGHT_START,
        SEARCH_HIGHLIGHT_END,
        match,
        SEARCH_RESULT_LIMIT
      ) as (DbThreadSummary & { snippet: string | null })[]
    return rows.map((row) => ({
      ...toSummary(row),
      // snippet() returns leading body text even when only the title hit.
      snippet: row.snippet?.includes(SEARCH_HIGHLIGHT_START)
        ? row.snippet
        : null,
    }))
  })
}

export function readThreadSummary(threadId: string): ThreadSummary | null {
  return withDbSpan(
    'DB read thread summary',
    'db.read',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      const row = db
        .prepare(`SELECT ${SUMMARY_COLUMNS} FROM threads WHERE id = ?`)
        .get(threadId) as DbThreadSummary | undefined
      return row ? toSummary(row) : null
    }
  )
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
