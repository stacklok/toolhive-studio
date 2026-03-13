import { ipcMain } from 'electron'
import {
  discoverToolSupportedModels,
  fetchProviderModelsHandler,
  getAllProvidersHandler,
} from '../../chat/providers'

export function register() {
  ipcMain.handle(
    'chat:fetch-provider-models',
    (_, providerId: string, tempCredential?: string) =>
      fetchProviderModelsHandler(providerId, tempCredential)
  )

  ipcMain.handle('chat:get-providers', () => getAllProvidersHandler())

  ipcMain.handle('chat:discover-models', () => discoverToolSupportedModels())
}
