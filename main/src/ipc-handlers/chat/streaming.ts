import { ipcMain, app } from 'electron'
import { type ChatRequest, handleChatStreamRealtime } from '../../chat'
import {
  cancelStream,
  getActiveStreamId,
  getStreamingChatIds,
  purgeSender,
  subscribeToStream,
  unsubscribeFromStream,
} from '../../chat/active-streams'
import log from '../../logger'

let purgeListenerInstalled = false

function ensurePurgeListener() {
  if (purgeListenerInstalled) return
  purgeListenerInstalled = true
  app.on('web-contents-created', (_event, contents) => {
    contents.once('destroyed', () => purgeSender(contents))
  })
}

export function register() {
  ensurePurgeListener()

  ipcMain.handle('chat:stream', async (event, request: ChatRequest) => {
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    // Fire-and-forget — the renderer attaches via IPC events. We only
    // need this catch to surface failures that throw *before* the
    // registry entry exists (provider misconfig, duplicate stream, …);
    // otherwise the renderer would hang waiting for chunks.
    void handleChatStreamRealtime(request, streamId, event.sender).catch(
      (error) => {
        const message = error instanceof Error ? error.message : 'Unknown error'
        log.error(
          `[CHAT_STREAM_IPC] Setup failed for ${request.chatId}:`,
          error
        )
        if (!event.sender.isDestroyed()) {
          try {
            event.sender.send('chat:stream:error', {
              streamId,
              chatId: request.chatId,
              error: message,
            })
          } catch {
            // sender destroyed between guard and send
          }
        }
      }
    )
    return { streamId }
  })

  ipcMain.handle('chat:stream:resume', (event, chatId: string) => {
    if (!chatId) return null
    return subscribeToStream(chatId, event.sender)
  })

  ipcMain.handle('chat:stream:unsubscribe', (event, chatId: string) => {
    if (!chatId) return
    unsubscribeFromStream(chatId, event.sender)
  })

  ipcMain.handle('chat:stream:cancel', (_event, chatId: string) => {
    if (!chatId) return false
    return cancelStream(chatId)
  })

  ipcMain.handle('chat:stream:active-id', (_event, chatId: string) => {
    if (!chatId) return null
    return getActiveStreamId(chatId)
  })

  ipcMain.handle('chat:stream:streaming-ids', () => getStreamingChatIds())
}
