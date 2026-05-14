import { getDb, isDbWritable } from '../database'
import { withDbSpan } from '../telemetry'
import type { ChatSettingsThread } from '../../chat/threads-storage'

interface ExistingThreadColumns {
  agent_id: string | null
  selected_provider: string | null
  selected_model: string | null
  enabled_mcp_tools: string | null
  enabled_skills: string | null
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
                    enabled_mcp_tools, enabled_skills
             FROM threads WHERE id = ?`
          )
          .get(thread.id) as ExistingThreadColumns | undefined

        const nextAgentId =
          thread.agentId !== undefined
            ? thread.agentId
            : (previous?.agent_id ?? null)

        const nextSelectedProvider =
          thread.selectedProvider !== undefined
            ? thread.selectedProvider
            : (previous?.selected_provider ?? null)

        const nextSelectedModel =
          thread.selectedModel !== undefined
            ? thread.selectedModel
            : (previous?.selected_model ?? null)

        const nextEnabledMcpTools =
          thread.enabledMcpTools !== undefined
            ? thread.enabledMcpTools === null
              ? null
              : JSON.stringify(thread.enabledMcpTools)
            : (previous?.enabled_mcp_tools ?? null)

        const nextEnabledSkills =
          thread.enabledSkills !== undefined
            ? thread.enabledSkills === null
              ? null
              : JSON.stringify(thread.enabledSkills)
            : (previous?.enabled_skills ?? null)

        db.prepare(
          `INSERT OR REPLACE INTO threads (
             id, title, created_at, last_edit_timestamp,
             title_edited_by_user, starred, agent_id,
             selected_provider, selected_model,
             enabled_mcp_tools, enabled_skills
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          nextEnabledSkills
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
      })()
    }
  )
}

export function deleteThreadFromDb(threadId: string): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB delete thread',
    'db.write',
    { 'db.thread_id': threadId },
    () => {
      const db = getDb()
      db.prepare('DELETE FROM threads WHERE id = ?').run(threadId)
    }
  )
}

export function clearAllThreadsFromDb(): void {
  if (!isDbWritable()) return
  withDbSpan('DB clear all threads', 'db.write', {}, () => {
    const db = getDb()
    db.transaction(() => {
      db.prepare('DELETE FROM thread_messages').run()
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
