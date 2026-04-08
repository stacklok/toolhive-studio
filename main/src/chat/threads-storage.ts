import Store from 'electron-store'
import log from '../logger'
import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import type { UIMessage } from 'ai'
import type { ChatUIMessage } from './types'
import {
  writeThread,
  deleteThreadFromDb,
  clearAllThreadsFromDb,
  writeActiveThread,
} from '../db/writers/threads-writer'
import {
  readThread as readThreadFromDb,
  readAllThreads as readAllThreadsFromDb,
  readActiveThreadId as readActiveThreadIdFromDb,
  readThreadCount as readThreadCountFromDb,
} from '../db/readers/threads-reader'

export interface ChatSettingsThread {
  id: string
  title?: string
  /** When true, auto-title generation will never overwrite this title. */
  titleEditedByUser?: boolean
  starred?: boolean
  messages: ChatUIMessage[]
  lastEditTimestamp: number
  createdAt: number
}

interface ChatSettingsThreads {
  threads: Record<string, ChatSettingsThread>
  activeThreadId?: string
}

// Kept for one-time reconciliation migration; remove after migration grace period
export const threadsStore = new Store<ChatSettingsThreads>({
  name: 'chat-threads',
  encryptionKey: 'toolhive-threads-encryption-key',
  clearInvalidConfig: true,
  defaults: {
    threads: {},
    activeThreadId: undefined,
  },
})

function generateThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function createThread(
  title?: string,
  initialMessages: ChatSettingsThread['messages'] = []
): { success: boolean; threadId?: string; error?: string } {
  try {
    const threadId = generateThreadId()
    const now = Date.now()

    const newThread: ChatSettingsThread = {
      id: threadId,
      title,
      messages: initialMessages,
      lastEditTimestamp: now,
      createdAt: now,
    }

    try {
      writeThread(newThread)
      writeActiveThread(threadId)
    } catch (err) {
      log.error('[DB] Failed to write thread:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }

    return { success: true, threadId }
  } catch (error) {
    log.error('[THREADS] Failed to create thread:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function getThread(threadId: string): ChatSettingsThread | null {
  try {
    return readThreadFromDb(threadId)
  } catch (err) {
    log.error(`[THREADS] Failed to get thread ${threadId}:`, err)
    return null
  }
}

export function getAllThreads(): ChatSettingsThread[] {
  try {
    return readAllThreadsFromDb()
  } catch (err) {
    log.error('[THREADS] Failed to get all threads:', err)
    return []
  }
}

export function updateThread(
  threadId: string,
  updates: Partial<Omit<ChatSettingsThread, 'id' | 'createdAt'>>
): { success: boolean; error?: string } {
  try {
    const existing = readThreadFromDb(threadId)
    if (!existing) {
      return { success: false, error: 'Thread not found' }
    }

    const updatedThread: ChatSettingsThread = {
      ...existing,
      ...updates,
      lastEditTimestamp: Date.now(),
    }

    writeThread(updatedThread)
    return { success: true }
  } catch (error) {
    log.error(`[THREADS] Failed to update thread ${threadId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function addMessageToThread(
  threadId: string,
  message: UIMessage<{
    createdAt?: number
    model?: string
    providerId?: string
    totalUsage?: LanguageModelV2Usage
    responseTime?: number
    finishReason?: string
  }>
): { success: boolean; error?: string } {
  try {
    const existing = readThreadFromDb(threadId)
    if (!existing) {
      return { success: false, error: 'Thread not found' }
    }

    const updatedThread: ChatSettingsThread = {
      ...existing,
      messages: [...existing.messages, message],
      lastEditTimestamp: Date.now(),
    }

    writeThread(updatedThread)
    return { success: true }
  } catch (error) {
    log.error(`[THREADS] Failed to add message to thread ${threadId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function updateThreadMessages(
  threadId: string,
  messages: ChatSettingsThread['messages']
): { success: boolean; error?: string } {
  try {
    const existing = readThreadFromDb(threadId)
    if (!existing) {
      log.info('Thread not found')
      return { success: false, error: 'Thread not found' }
    }

    const updatedThread: ChatSettingsThread = {
      ...existing,
      messages,
      lastEditTimestamp: Date.now(),
    }

    writeThread(updatedThread)
    return { success: true }
  } catch (error) {
    log.error(
      `[THREADS] Failed to update messages in thread ${threadId}:`,
      error
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function deleteThread(threadId: string): {
  success: boolean
  error?: string
} {
  try {
    const existing = readThreadFromDb(threadId)
    if (!existing) {
      return { success: false, error: 'Thread not found' }
    }

    deleteThreadFromDb(threadId)

    // If this was the active thread, clear the active thread
    const activeThreadId = readActiveThreadIdFromDb()
    if (activeThreadId === threadId) {
      writeActiveThread(undefined)
    }

    return { success: true }
  } catch (error) {
    log.error(`[THREADS] Failed to delete thread ${threadId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function getActiveThreadId(): string | undefined {
  try {
    return readActiveThreadIdFromDb() ?? undefined
  } catch (error) {
    log.error('[THREADS] Failed to get active thread ID:', error)
    return undefined
  }
}

export function setActiveThreadId(threadId: string | undefined): {
  success: boolean
  error?: string
} {
  try {
    if (threadId) {
      // Verify thread exists
      const thread = getThread(threadId)
      if (!thread) {
        return { success: false, error: 'Thread not found' }
      }
    }

    writeActiveThread(threadId)
    return { success: true }
  } catch (error) {
    log.error('[THREADS] Failed to set active thread ID:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function clearAllThreads(): { success: boolean; error?: string } {
  try {
    clearAllThreadsFromDb()
    return { success: true }
  } catch (error) {
    log.error('[THREADS] Failed to clear all threads:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function getThreadCount(): number {
  try {
    return readThreadCountFromDb()
  } catch (error) {
    log.error('[THREADS] Failed to get thread count:', error)
    return 0
  }
}
