import { ipcMain } from 'electron'
import { isChatRuntimeReady } from '../../chat/runtime/health'
import { unavailableResult } from '../../chat/runtime/adapters'
import { CHAT_UNAVAILABLE_USER_MESSAGE } from '../../chat/runtime/errors'

export function withChatRuntime<T extends Record<string, unknown>>(
  handler: () => T | Promise<T>
): () => Promise<T | { success: false; error: string }> {
  return async () => {
    if (!isChatRuntimeReady()) {
      return unavailableResult(CHAT_UNAVAILABLE_USER_MESSAGE)
    }
    return handler()
  }
}

export function registerChatHealthHandler() {
  ipcMain.handle('chat:runtime:health', () => ({
    ready: isChatRuntimeReady(),
  }))
}
