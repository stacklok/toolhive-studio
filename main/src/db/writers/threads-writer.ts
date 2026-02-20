import { getDb, isDbWritable } from '../database'
import log from '../../logger'
import type { ChatSettingsThread } from '../../chat/threads-storage'

export function writeThread(thread: ChatSettingsThread): void {
  if (!isDbWritable()) return
  try {
    const db = getDb()
    db.transaction(() => {
      db.prepare(
        `INSERT OR REPLACE INTO threads (id, title, created_at, last_edit_timestamp)
         VALUES (?, ?, ?, ?)`
      ).run(
        thread.id,
        thread.title ?? null,
        thread.createdAt,
        thread.lastEditTimestamp
      )

      // Replace all messages for this thread
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
  } catch (err) {
    log.error(`[DB] Failed to write thread ${thread.id}:`, err)
  }
}

export function deleteThreadFromDb(threadId: string): void {
  if (!isDbWritable()) return
  try {
    const db = getDb()
    db.prepare('DELETE FROM threads WHERE id = ?').run(threadId)
  } catch (err) {
    log.error(`[DB] Failed to delete thread ${threadId}:`, err)
  }
}

export function clearAllThreadsFromDb(): void {
  if (!isDbWritable()) return
  try {
    const db = getDb()
    db.transaction(() => {
      db.prepare('DELETE FROM thread_messages').run()
      db.prepare('DELETE FROM threads').run()
      db.prepare('DELETE FROM active_thread').run()
    })()
  } catch (err) {
    log.error('[DB] Failed to clear all threads:', err)
  }
}

export function writeActiveThread(threadId: string | undefined): void {
  if (!isDbWritable()) return
  try {
    const db = getDb()
    if (threadId) {
      db.prepare(
        'INSERT OR REPLACE INTO active_thread (id, thread_id) VALUES (1, ?)'
      ).run(threadId)
    } else {
      db.prepare('DELETE FROM active_thread WHERE id = 1').run()
    }
  } catch (err) {
    log.error('[DB] Failed to write active thread:', err)
  }
}
