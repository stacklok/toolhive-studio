import { Effect } from 'effect'
import type { LanguageModelUsage } from 'ai'
import type { UIMessage } from 'ai'
import { runChatSyncOr, runChatToResultSync } from './runtime'
import { ThreadsService } from './threads/threads-service'
import type {
  ChatSettingsThread,
  ThreadMessage,
  ThreadSummary,
} from './threads/types'

export type { ChatSettingsThread, ThreadSummary } from './threads/types'

export function createThread(
  title?: string,
  initialMessages: ThreadMessage[] = [],
  explicitId?: string
): { success: boolean; threadId?: string; error?: string } {
  return runChatToResultSync(
    ThreadsService.use((s) =>
      s.createThread(title, initialMessages, explicitId)
    ).pipe(Effect.map(({ threadId }) => ({ threadId })))
  )
}

export function getThread(threadId: string): ChatSettingsThread | null {
  return runChatSyncOr(
    ThreadsService.use((s) => s.getThread(threadId)),
    null
  )
}

export function listThreads(): ThreadSummary[] {
  return runChatSyncOr(
    ThreadsService.use((s) => s.listThreads()),
    []
  )
}

export function updateThread(
  threadId: string,
  updates: Partial<Omit<ChatSettingsThread, 'id' | 'createdAt'>>
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadsService.use((s) => s.updateThread(threadId, updates)).pipe(
      Effect.as({})
    )
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
    ThreadsService.use((s) => s.addMessageToThread(threadId, message)).pipe(
      Effect.as({})
    )
  )
}

export function updateThreadMessages(
  threadId: string,
  messages: ChatSettingsThread['messages']
): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadsService.use((s) => s.updateThreadMessages(threadId, messages)).pipe(
      Effect.as({})
    )
  )
}

export function deleteThread(threadId: string): {
  success: boolean
  error?: string
} {
  return runChatToResultSync(
    ThreadsService.use((s) => s.deleteThread(threadId)).pipe(Effect.as({}))
  )
}

export function getActiveThreadId(): string | undefined {
  return runChatSyncOr(
    ThreadsService.use((s) => s.getActiveThreadId()),
    undefined
  )
}

export function setActiveThreadId(threadId: string | undefined): {
  success: boolean
  error?: string
} {
  return runChatToResultSync(
    ThreadsService.use((s) => s.setActiveThreadId(threadId)).pipe(Effect.as({}))
  )
}

export function clearAllThreads(): { success: boolean; error?: string } {
  return runChatToResultSync(
    ThreadsService.use((s) => s.clearAllThreads()).pipe(Effect.as({}))
  )
}

export function getThreadCount(): number {
  return runChatSyncOr(
    ThreadsService.use((s) => s.getThreadCount()),
    0
  )
}
