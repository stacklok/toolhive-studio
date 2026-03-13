import { ipcMain } from 'electron'
import { type ChatRequest, handleChatStreamRealtime } from '../../chat'

export function register() {
  ipcMain.handle('chat:stream', async (event, request: ChatRequest) => {
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    handleChatStreamRealtime(request, streamId, event.sender)
    return { streamId }
  })
}
