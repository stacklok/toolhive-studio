import { ipcMain } from 'electron'
import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import type { UIMessage } from 'ai'
import {
  createThread,
  getThread,
  getAllThreads,
  updateThread,
  deleteThread,
  clearAllThreads,
  getThreadCount,
  addMessageToThread,
  updateThreadMessages,
  getActiveThreadId,
  setActiveThreadId,
  createChatThread,
  getThreadMessagesForTransport,
  getThreadInfo,
  ensureThreadExists,
  type ChatSettingsThread,
} from '../../chat'
import { generateThreadTitle } from '../../chat/generate-thread-title'

export function register() {
  ipcMain.handle(
    'chat:create-thread',
    (
      _,
      title?: string,
      initialMessages?: UIMessage<{
        createdAt?: number
        model?: string
        totalUsage?: LanguageModelV2Usage
        responseTime?: number
        finishReason?: string
      }>[]
    ) => createThread(title, initialMessages)
  )
  ipcMain.handle('chat:get-thread', (_, threadId: string) =>
    getThread(threadId)
  )
  ipcMain.handle('chat:get-all-threads', () => getAllThreads())
  ipcMain.handle(
    'chat:update-thread',
    (
      _,
      threadId: string,
      updates: Partial<Omit<ChatSettingsThread, 'id' | 'createdAt'>>
    ) => updateThread(threadId, updates)
  )
  ipcMain.handle('chat:delete-thread', (_, threadId: string) =>
    deleteThread(threadId)
  )
  ipcMain.handle('chat:clear-all-threads', () => clearAllThreads())
  ipcMain.handle('chat:get-thread-count', () => getThreadCount())

  ipcMain.handle(
    'chat:add-message-to-thread',
    (
      _,
      threadId: string,
      message: UIMessage<{
        createdAt?: number
        model?: string
        totalUsage?: LanguageModelV2Usage
        responseTime?: number
        finishReason?: string
      }>
    ) => addMessageToThread(threadId, message)
  )
  ipcMain.handle(
    'chat:update-thread-messages',
    (
      _,
      threadId: string,
      messages: UIMessage<{
        createdAt?: number
        model?: string
        totalUsage?: LanguageModelV2Usage
        responseTime?: number
        finishReason?: string
      }>[]
    ) => updateThreadMessages(threadId, messages)
  )

  ipcMain.handle('chat:get-active-thread-id', () => getActiveThreadId())
  ipcMain.handle('chat:set-active-thread-id', (_, threadId?: string) =>
    setActiveThreadId(threadId)
  )

  ipcMain.handle('chat:create-chat-thread', (_, title?: string) =>
    createChatThread(title)
  )
  ipcMain.handle(
    'chat:get-thread-messages-for-transport',
    (_, threadId: string) => getThreadMessagesForTransport(threadId)
  )
  ipcMain.handle('chat:get-thread-info', (_, threadId: string) =>
    getThreadInfo(threadId)
  )
  ipcMain.handle(
    'chat:ensure-thread-exists',
    (_, threadId?: string, title?: string) =>
      ensureThreadExists(threadId, title)
  )

  ipcMain.handle('chat:generate-thread-title', (_, threadId: string) =>
    generateThreadTitle(threadId)
  )
}
