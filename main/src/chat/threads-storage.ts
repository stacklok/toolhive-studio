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
import { getFeatureFlag } from '../feature-flags/flags'
import { featureFlagKeys } from '../../../utils/feature-flags'

export interface ChatSettingsThread {
  id: string
  title?: string
  messages: ChatUIMessage[]
  lastEditTimestamp: number
  createdAt: number
}

interface ChatSettingsThreads {
  threads: Record<string, ChatSettingsThread>
  activeThreadId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUIMessage(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string') return false
  if (typeof value.role !== 'string') return false
  if (!Array.isArray(value.parts)) return false

  return true
}

function isThread(value: unknown): value is ChatSettingsThread {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string') return false
  if (typeof value.lastEditTimestamp !== 'number') return false
  if (typeof value.createdAt !== 'number') return false
  if (!Array.isArray(value.messages)) return false

  return value.messages.every((msg) => isUIMessage(msg))
}

function isThreadsRecord(
  value: unknown
): value is ChatSettingsThreads['threads'] {
  if (!isRecord(value)) return false
  return Object.values(value).every((thread) => isThread(thread))
}

const threadsStore = new Store<ChatSettingsThreads>({
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

    const threads = threadsStore.get('threads')
    const typedThreads = isThreadsRecord(threads) ? threads : {}
    typedThreads[threadId] = newThread

    threadsStore.set('threads', typedThreads)
    threadsStore.set('activeThreadId', threadId)

    try {
      writeThread(newThread)
      writeActiveThread(threadId)
    } catch (err) {
      log.error('[DB] Failed to dual-write thread:', err)
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
    if (getFeatureFlag(featureFlagKeys.SQLITE_READS_THREADS)) {
      try {
        return readThreadFromDb(threadId)
      } catch (err) {
        log.error(
          '[DB] SQLite read failed, falling back to electron-store:',
          err
        )
      }
    }
    const threads = threadsStore.get('threads')
    if (isThreadsRecord(threads)) {
      return threads[threadId] || null
    }
    return null
  } catch (error) {
    log.error(`[THREADS] Failed to get thread ${threadId}:`, error)
    return null
  }
}

export function getAllThreads(): ChatSettingsThread[] {
  try {
    if (getFeatureFlag(featureFlagKeys.SQLITE_READS_THREADS)) {
      try {
        return readAllThreadsFromDb()
      } catch (err) {
        log.error(
          '[DB] SQLite read failed, falling back to electron-store:',
          err
        )
      }
    }
    const threads = threadsStore.get('threads')
    if (isThreadsRecord(threads)) {
      return Object.values(threads).sort(
        (a, b) => b.lastEditTimestamp - a.lastEditTimestamp
      )
    }
    return threads
  } catch (error) {
    log.error('[THREADS] Failed to get all threads:', error)
    return []
  }
}

export function updateThread(
  threadId: string,
  updates: Partial<Omit<ChatSettingsThread, 'id' | 'createdAt'>>
): { success: boolean; error?: string } {
  try {
    const threads = threadsStore.get('threads')
    const typedThreads = isThreadsRecord(threads) ? threads : {}

    if (!typedThreads[threadId]) {
      return { success: false, error: 'Thread not found' }
    }

    const updatedThread: ChatSettingsThread = {
      ...typedThreads[threadId],
      ...updates,
      lastEditTimestamp: Date.now(),
    }

    typedThreads[threadId] = updatedThread
    threadsStore.set('threads', typedThreads)

    try {
      writeThread(updatedThread)
    } catch (err) {
      log.error('[DB] Failed to dual-write thread update:', err)
    }

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
    const threads = threadsStore.get('threads')
    const typedThreads = isThreadsRecord(threads) ? threads : {}

    if (!typedThreads[threadId]) {
      return { success: false, error: 'Thread not found' }
    }

    const updatedMessages = [...typedThreads[threadId].messages, message]

    const updatedThread: ChatSettingsThread = {
      ...typedThreads[threadId],
      messages: updatedMessages,
      lastEditTimestamp: Date.now(),
    }

    typedThreads[threadId] = updatedThread
    threadsStore.set('threads', typedThreads)

    try {
      writeThread(updatedThread)
    } catch (err) {
      log.error('[DB] Failed to dual-write message addition:', err)
    }

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
    const threads = threadsStore.get('threads')
    const typedThreads = isThreadsRecord(threads) ? threads : {}

    if (!typedThreads[threadId]) {
      log.info('Thread not found')
      return { success: false, error: 'Thread not found' }
    }

    const updatedThread: ChatSettingsThread = {
      ...typedThreads[threadId],
      messages,
      lastEditTimestamp: Date.now(),
    }

    typedThreads[threadId] = updatedThread
    threadsStore.set('threads', typedThreads)

    try {
      writeThread(updatedThread)
    } catch (err) {
      log.error('[DB] Failed to dual-write thread messages:', err)
    }

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
    const threads = threadsStore.get('threads')
    const typedThreads = isThreadsRecord(threads) ? threads : {}

    if (!typedThreads[threadId]) {
      return { success: false, error: 'Thread not found' }
    }

    delete typedThreads[threadId]
    threadsStore.set('threads', typedThreads)

    try {
      deleteThreadFromDb(threadId)
    } catch (err) {
      log.error('[DB] Failed to dual-write thread deletion:', err)
    }

    // If this was the active thread, clear the active thread
    const activeThreadId = threadsStore.get('activeThreadId')
    if (activeThreadId === threadId) {
      threadsStore.set('activeThreadId', undefined)
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
    if (getFeatureFlag(featureFlagKeys.SQLITE_READS_THREADS)) {
      try {
        return readActiveThreadIdFromDb()
      } catch (err) {
        log.error(
          '[DB] SQLite read failed, falling back to electron-store:',
          err
        )
      }
    }
    return threadsStore.get('activeThreadId')
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

    threadsStore.set('activeThreadId', threadId)

    try {
      writeActiveThread(threadId)
    } catch (err) {
      log.error('[DB] Failed to dual-write active thread:', err)
    }

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
    threadsStore.set('threads', {})
    threadsStore.set('activeThreadId', undefined)

    try {
      clearAllThreadsFromDb()
    } catch (err) {
      log.error('[DB] Failed to dual-write clear all threads:', err)
    }

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
    if (getFeatureFlag(featureFlagKeys.SQLITE_READS_THREADS)) {
      try {
        return readThreadCountFromDb()
      } catch (err) {
        log.error(
          '[DB] SQLite read failed, falling back to electron-store:',
          err
        )
      }
    }
    const threads = threadsStore.get('threads')
    if (isThreadsRecord(threads)) {
      return Object.keys(threads).length
    }
    return 0
  } catch (error) {
    log.error('[THREADS] Failed to get thread count:', error)
    return 0
  }
}
