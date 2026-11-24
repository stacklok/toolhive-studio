import type Database from 'better-sqlite3'
import { getDb, isDbWritable } from '../database'
import { withDbSpan } from '../telemetry'
import {
  readSelectedModel,
  readEnabledMcpTools,
  readEnabledSkills,
} from '../readers/chat-settings-reader'
import type { ChatSettingsThread } from '../../chat/threads-storage'
import { extractSearchText } from '../thread-search-text'

interface ExistingThreadColumns {
  agent_id: string | null
  selected_provider: string | null
  selected_model: string | null
  enabled_mcp_tools: string | null
  enabled_skills: string | null
  archived_at: number | null
}

export function writeThread(thread: ChatSettingsThread): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB write thread',
    'db.write',
    {
      'db.thread_id': thread.id,
      'db.message_count': thread.messages.length,
    },
    () => {
      const db = getDb()
      db.transaction(() => {
        // Preserve existing per-thread columns when the caller didn't provide
        // them (e.g. message-only updates). If the thread is brand new,
        // previous will be undefined.
        const previous = db
          .prepare(
            `SELECT agent_id, selected_provider, selected_model,
                    enabled_mcp_tools, enabled_skills, archived_at
             FROM threads WHERE id = ?`
          )
          .get(thread.id) as ExistingThreadColumns | undefined

        // For brand-new rows where the caller didn't supply per-thread
        // settings, snapshot the current globals so the thread inherits the
        // last-used selection and stays isolated when globals later change.
        // For existing rows we just preserve what's already there.
        const isNewRow = !previous
        const globalSnapshot = isNewRow
          ? {
              selectedModel: readSelectedModel(),
              enabledMcpTools: readEnabledMcpTools(),
              enabledSkills: readEnabledSkills(),
            }
          : null

        const nextAgentId =
          thread.agentId !== undefined
            ? thread.agentId
            : (previous?.agent_id ?? null)

        const nextSelectedProvider =
          thread.selectedProvider !== undefined
            ? thread.selectedProvider
            : previous
              ? (previous.selected_provider ?? null)
              : globalSnapshot!.selectedModel.provider || null

        const nextSelectedModel =
          thread.selectedModel !== undefined
            ? thread.selectedModel
            : previous
              ? (previous.selected_model ?? null)
              : globalSnapshot!.selectedModel.model || null

        const nextEnabledMcpTools =
          thread.enabledMcpTools !== undefined
            ? thread.enabledMcpTools === null
              ? null
              : JSON.stringify(thread.enabledMcpTools)
            : previous
              ? (previous.enabled_mcp_tools ?? null)
              : JSON.stringify(globalSnapshot!.enabledMcpTools)

        const nextEnabledSkills =
          thread.enabledSkills !== undefined
            ? thread.enabledSkills === null
              ? null
              : JSON.stringify(thread.enabledSkills)
            : previous
              ? (previous.enabled_skills ?? null)
              : JSON.stringify(globalSnapshot!.enabledSkills)

        // INSERT OR REPLACE rewrites the whole row, so archived_at must be
        // carried over explicitly or every message write would unarchive.
        const nextArchivedAt =
          thread.archivedAt !== undefined
            ? thread.archivedAt
            : (previous?.archived_at ?? null)

        db.prepare(
          `INSERT OR REPLACE INTO threads (
             id, title, created_at, last_edit_timestamp,
             title_edited_by_user, starred, agent_id,
             selected_provider, selected_model,
             enabled_mcp_tools, enabled_skills, archived_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          thread.id,
          thread.title ?? null,
          thread.createdAt,
          thread.lastEditTimestamp,
          thread.titleEditedByUser ? 1 : 0,
          thread.starred ? 1 : 0,
          nextAgentId,
          nextSelectedProvider,
          nextSelectedModel,
          nextEnabledMcpTools,
          nextEnabledSkills,
          nextArchivedAt
        )

        db.prepare('DELETE FROM thread_messages WHERE thread_id = ?').run(
          thread.id
        )

        const insert = db.prepare(
          `INSERT INTO thread_messages (id, thread_id, role, parts, metadata, position)
         VALUES (?, ?, ?, ?, ?, ?)`
        )

        for (let i = 0; i < thread.messages.length; i++) {
          const msg = thread.messages[i]!
          const { id, role, parts, ...rest } = msg
          insert.run(
            id,
            thread.id,
            role,
            JSON.stringify(parts),
            JSON.stringify(rest),
            i
          )
        }

        // Keep the search index in the same transaction as the messages.
        reindexThread(
          db,
          thread.id,
          thread.title ?? '',
          extractSearchText(thread.messages.map((m) => m.parts))
        )
      })()
    }
  )
}

/**
 * Replaces a thread's search row. Goes through `thread_search_ids` so the
 * delete is a rowid lookup: FTS5 can't index `thread_id`, and filtering on
 * it scans the whole index on every streaming snapshot.
 */
function reindexThread(
  db: Database.Database,
  threadId: string,
  title: string,
  body: string
): void {
  const existing = db
    .prepare('SELECT rowid FROM thread_search_ids WHERE thread_id = ?')
    .get(threadId) as { rowid: number } | undefined
  let rowid: number | bigint
  if (existing) {
    rowid = existing.rowid
    db.prepare('DELETE FROM thread_search WHERE rowid = ?').run(rowid)
  } else {
    rowid = db
      .prepare('INSERT INTO thread_search_ids (thread_id) VALUES (?)')
      .run(threadId).lastInsertRowid
  }
  db.prepare(
    'INSERT INTO thread_search (rowid, thread_id, title, body) VALUES (?, ?, ?, ?)'
  ).run(rowid, threadId, title, body)
}

function unindexThread(db: Database.Database, threadId: string): void {
  db.prepare(
    'DELETE FROM thread_search WHERE rowid = (SELECT rowid FROM thread_search_ids WHERE thread_id = ?)'
  ).run(threadId)
  db.prepare('DELETE FROM thread_search_ids WHERE thread_id = ?').run(threadId)
}

export function deleteThreadFromDb(threadId: string): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB delete thread',
    'db.write',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      db.transaction(() => {
        unindexThread(db, threadId)
        db.prepare('DELETE FROM threads WHERE id = ?').run(threadId)
      })()
    }
  )
}

/**
 * Sets or clears `archived_at` without touching `last_edit_timestamp`:
 * archiving isn't an edit, so unarchiving puts the thread back in its
 * original place. Returns false when the thread doesn't exist.
 */
export function writeThreadArchived(
  threadId: string,
  archivedAt: number | null
): boolean {
  if (!isDbWritable()) return false
  return withDbSpan(
    'DB write thread archived',
    'db.write',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      const result = db
        .prepare('UPDATE threads SET archived_at = ? WHERE id = ?')
        .run(archivedAt, threadId)
      return result.changes > 0
    }
  )
}

export function clearAllThreadsFromDb(): void {
  if (!isDbWritable()) return
  withDbSpan('DB clear all threads', 'db.write', {}, () => {
    const db = getDb()
    db.transaction(() => {
      db.prepare('DELETE FROM thread_messages').run()
      db.prepare('DELETE FROM thread_search').run()
      db.prepare('DELETE FROM thread_search_ids').run()
      db.prepare('DELETE FROM threads').run()
      db.prepare('DELETE FROM active_thread').run()
    })()
  })
}

export function writeActiveThread(threadId: string | undefined): void {
  if (!isDbWritable()) return
  withDbSpan('DB write active thread', 'db.write', {}, () => {
    const db = getDb()
    if (threadId) {
      db.prepare(
        'INSERT OR REPLACE INTO active_thread (id, thread_id) VALUES (1, ?)'
      ).run(threadId)
    } else {
      db.prepare('DELETE FROM active_thread WHERE id = 1').run()
    }
  })
}

export function writeThreadSelectedModel(
  threadId: string,
  provider: string | null,
  model: string | null
): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB write thread selected model',
    'db.write',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      db.prepare(
        `UPDATE threads
         SET selected_provider = ?, selected_model = ?, last_edit_timestamp = ?
         WHERE id = ?`
      ).run(provider, model, Date.now(), threadId)
    }
  )
}

export function writeThreadEnabledMcpTools(
  threadId: string,
  tools: Record<string, string[]> | null
): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB write thread enabled MCP tools',
    'db.write',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      db.prepare(
        `UPDATE threads
         SET enabled_mcp_tools = ?, last_edit_timestamp = ?
         WHERE id = ?`
      ).run(tools === null ? null : JSON.stringify(tools), Date.now(), threadId)
    }
  )
}

export function writeThreadEnabledSkills(
  threadId: string,
  skills: string[] | null
): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB write thread enabled skills',
    'db.write',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      db.prepare(
        `UPDATE threads
         SET enabled_skills = ?, last_edit_timestamp = ?
         WHERE id = ?`
      ).run(
        skills === null ? null : JSON.stringify(skills),
        Date.now(),
        threadId
      )
    }
  )
}
