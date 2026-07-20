import { Effect } from 'effect'
import { runChatSyncOr, runChatPromise, runChatToResultSync } from './runtime'
import { ThreadsService } from './threads/threads-service'

const EMPTY_THREAD_INFO = {
  thread: null,
  messageCount: 0,
  lastActivity: null,
  hasUserMessages: false,
  hasAssistantMessages: false,
}

export function createChatThread(title?: string): {
  success: boolean
  threadId?: string
  error?: string
} {
  return runChatToResultSync(
    ThreadsService.createThread(title).pipe(
      Effect.map(({ threadId }) => ({ threadId }))
    )
  )
}

/**
 * Fail closed when the runtime is unavailable or the DB read fails.
 * Soft-failing to `[]` would hydrate the renderer as an empty thread; the
 * next send overwrites real SQLite history with a full replace.
 */
export async function getThreadMessagesForTransport(threadId: string) {
  return runChatPromise(ThreadsService.getThreadMessagesForTransport(threadId))
}

export function getThreadInfo(threadId: string) {
  return runChatSyncOr(
    ThreadsService.getThreadInfo(threadId),
    EMPTY_THREAD_INFO
  )
}

export function ensureThreadExists(
  threadId?: string,
  title?: string
): { success: boolean; threadId?: string; error?: string; isNew?: boolean } {
  return runChatToResultSync(ThreadsService.ensureThreadExists(threadId, title))
}
