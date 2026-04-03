import { getDb, isDbWritable } from '../database'
import { withDbSpan } from '../telemetry'
import type { ChatSettingsThread } from '../../chat/threads-storage'

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
        db.prepare(
          `INSERT OR REPLACE INTO threads (id, title, created_at, last_edit_timestamp, title_edited_by_user, starred)
         VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          thread.id,
          thread.title ?? null,
          thread.createdAt,
          thread.lastEditTimestamp,
          thread.titleEditedByUser ? 1 : 0,
          thread.starred ? 1 : 0
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
