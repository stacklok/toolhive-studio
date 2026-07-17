import { ipcMain } from 'electron'
import { getChatRuntimeStatus } from '../../chat/runtime/lifecycle'

export function registerChatHealthHandler() {
  ipcMain.handle('chat:runtime:health', () => {
    const status = getChatRuntimeStatus()
    return {
      ready: status.health === 'ready',
      health: status.health,
      reason: status.reason,
    }
  })
}
