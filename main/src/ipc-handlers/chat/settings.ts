import { ipcMain } from 'electron'
import {
  getChatSettings,
  clearChatSettings,
  getSelectedModel,
  saveSelectedModel,
  handleSaveSettings,
} from '../../chat/settings-storage'

export function register() {
  ipcMain.handle('chat:get-settings', (_, providerId: string) =>
    getChatSettings(providerId as Parameters<typeof getChatSettings>[0])
  )
  ipcMain.handle(
    'chat:save-settings',
    (
      _,
      providerId: string,
      settings:
        | { apiKey: string; enabledTools: string[] }
        | { endpointURL: string; enabledTools: string[] }
    ) => handleSaveSettings(providerId, settings)
  )
  ipcMain.handle('chat:clear-settings', (_, providerId?: string) =>
    clearChatSettings(providerId as Parameters<typeof clearChatSettings>[0])
  )

  ipcMain.handle('chat:get-selected-model', () => getSelectedModel())
  ipcMain.handle(
    'chat:save-selected-model',
    (_, provider: string, model: string) => saveSelectedModel(provider, model)
  )
}
