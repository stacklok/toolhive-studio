import { Effect } from 'effect'
import { runChatSync, runChatPromise, runChatToResultSync } from './runtime'
import { ThreadsService } from './threads/threads-service'

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
  return runChatPromise(ThreadsService.getThreadMessagesForTransport(threadId))
}

export function getThreadInfo(threadId: string) {
  return runChatSync(ThreadsService.getThreadInfo(threadId))
}

export function ensureThreadExists(
  threadId?: string,
  title?: string
): { success: boolean; threadId?: string; error?: string; isNew?: boolean } {
  return runChatToResultSync(ThreadsService.ensureThreadExists(threadId, title))
}
