import {
  createThread,
  getThread,
  setActiveThreadId,
  type ChatSettingsThread,
} from './threads-storage'

/**
 * Create a new chat thread with an optional initial user message
 */
export function createChatThread(title?: string): {
  success: boolean
  threadId?: string
  error?: string
} {
  try {
    return createThread(title)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get messages from a thread in AI SDK format for use with the transport
 * Validates messages against current tool schemas
 */
export async function getThreadMessagesForTransport(
  threadId: string
): Promise<ChatSettingsThread['messages']> {
  const thread = getThread(threadId)
  if (!thread) {
    return []
  }

  if (!thread.messages || thread.messages.length === 0) {
    return []
  }

  // Return stored messages directly
  return thread.messages
}

/**
 * Get thread info with message count and last activity
 */
export function getThreadInfo(threadId: string): {
  thread: ChatSettingsThread | null
  messageCount: number
  lastActivity: Date | null
  hasUserMessages: boolean
  hasAssistantMessages: boolean
} {
  const thread = getThread(threadId)

  if (!thread) {
    return {
      thread: null,
      messageCount: 0,
      lastActivity: null,
      hasUserMessages: false,
      hasAssistantMessages: false,
    }
  }

  const messageCount = thread.messages.length
  const lastActivity = new Date(thread.lastEditTimestamp)
  const hasUserMessages = thread.messages.some(
    (msg: unknown) =>
      typeof msg === 'object' &&
      msg !== null &&
      'role' in msg &&
      msg.role === 'user'
  )
  const hasAssistantMessages = thread.messages.some(
    (msg: unknown) =>
      typeof msg === 'object' &&
      msg !== null &&
      'role' in msg &&
      msg.role === 'assistant'
  )

  return {
    thread,
    messageCount,
    lastActivity,
    hasUserMessages,
    hasAssistantMessages,
  }
}

/**
 * Create or get a thread for a chat session
 * If threadId is provided and exists, return that thread
 * Otherwise create a new thread
 */
export function ensureThreadExists(
  threadId?: string,
  title?: string
): { success: boolean; threadId?: string; error?: string; isNew?: boolean } {
  try {
    // If threadId provided, check if it exists
    if (threadId) {
      const existingThread = getThread(threadId)
      if (existingThread) {
        setActiveThreadId(threadId)
        return { success: true, threadId, isNew: false }
      }
    }

    // Create new thread
    const result = createThread(title)
    if (result.success && result.threadId) {
      return { success: true, threadId: result.threadId, isNew: true }
    }

    return { success: false, error: result.error }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
