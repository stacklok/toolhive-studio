import { Effect } from 'effect'
import { runChatSyncOr, runChatPromiseOr, runChatToResultSync } from './runtime'
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

export async function getThreadMessagesForTransport(threadId: string) {
  return runChatPromiseOr(
    ThreadsService.getThreadMessagesForTransport(threadId),
    []
  )
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
