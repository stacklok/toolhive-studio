import { ipcMain } from 'electron'
import { getPricingMap } from '../../chat/pricing'

export function register() {
  ipcMain.handle('chat:get-model-pricing', () => getPricingMap())
}
