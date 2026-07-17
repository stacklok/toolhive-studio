import { getLegacyThreadsStore } from './settings/legacy-store-access'
import { Effect } from 'effect'
import type { LanguageModelUsage } from 'ai'
import type { UIMessage } from 'ai'
import { runChatSync, runChatToResultSync } from './runtime'
import { ThreadsService } from './threads/threads-service'
import type { ChatSettingsThread, ThreadMessage } from './threads/types'

export type { ChatSettingsThread } from './threads/types'

// Kept for one-time reconciliation migration; remove after migration grace period
export const threadsStore = getLegacyThreadsStore()

export function createThread(
  title?: string,
  initialMessages: ThreadMessage[] = [],
  explicitId?: string
): { success: boolean; threadId?: string; error?: string } {
  return runChatToResultSync(
    ThreadsService.createThread(title, initialMessages, explicitId).pipe(
      Effect.map(({ threadId }) => ({ threadId }))
    )
  )
}

export function getThread(threadId: string): ChatSettingsThread | null {
  return runChatSync(ThreadsService.getThread(threadId))
}

export function getAllThreads(): ChatSettingsThread[] {
  return runChatSync(ThreadsService.getAllThreads())
}

export function updateThread(
  threadId: string,
  updates: Partial<Omit<ChatSettingsThread, 'id' | 'createdAt'>>
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadsService.updateThread(threadId, updates).pipe(Effect.as({}))
  )
}

export function addMessageToThread(
  threadId: string,
  message: UIMessage<{
    createdAt?: number
    model?: string
    providerId?: string
    totalUsage?: LanguageModelUsage
    responseTime?: number
    finishReason?: string
  }>
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadsService.addMessageToThread(threadId, message).pipe(Effect.as({}))
  )
}

export function updateThreadMessages(
  threadId: string,
  messages: ChatSettingsThread['messages']
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadsService.updateThreadMessages(threadId, messages).pipe(Effect.as({}))
  )
}

export function deleteThread(threadId: string): {
  success: boolean
  error?: string
} {
  return runChatToResultSync(
    ThreadsService.deleteThread(threadId).pipe(Effect.as({}))
  )
}

export function getActiveThreadId(): string | undefined {
  return runChatSync(ThreadsService.getActiveThreadId())
}

export function setActiveThreadId(threadId: string | undefined): {
  success: boolean
  error?: string
} {
  return runChatToResultSync(
    ThreadsService.setActiveThreadId(threadId).pipe(Effect.as({}))
  )
}

export function clearAllThreads(): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadsService.clearAllThreads().pipe(Effect.as({}))
  )
}

export function getThreadCount(): number {
  return runChatSync(ThreadsService.getThreadCount())
}
