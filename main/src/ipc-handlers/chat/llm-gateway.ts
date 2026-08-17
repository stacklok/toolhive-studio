import { ipcMain } from 'electron'
import type { LlmGatewaySetupInput } from '../../chat/providers/thv-llm'
import {
  ensureProxyStarted,
  getGatewayStatus,
  invalidateLlmConfigCache,
  readLlmConfig,
  saveLlmConfig,
  startConfiguredLlmProxyIfNeeded,
  stopOwnedProxy,
  toLlmGatewayConfigForm,
  warmupGatewayAuth,
} from '../../chat/providers/thv-llm'
import {
  clearPlaygroundGatewaySettings,
  enablePlaygroundGateway,
} from '../../chat/providers/thv-llm/playground'

export function register() {
  ipcMain.handle('chat:llm-gateway:status', async () => getGatewayStatus())

  ipcMain.handle('chat:llm-gateway:ensure-started', async () =>
    ensureProxyStarted()
  )

  ipcMain.handle('chat:llm-gateway:warmup-auth', async () => {
    invalidateLlmConfigCache()
    return warmupGatewayAuth()
  })

  ipcMain.handle('chat:llm-gateway:invalidate-config', () => {
    invalidateLlmConfigCache()
  })

  ipcMain.handle('chat:llm-gateway:get-config', async () => {
    invalidateLlmConfigCache()
    const config = await readLlmConfig()
    return toLlmGatewayConfigForm(config)
  })

  ipcMain.handle(
    'chat:llm-gateway:save-config',
    async (_event, input: LlmGatewaySetupInput) => {
      const result = await saveLlmConfig(input)
      if (result.ok) {
        invalidateLlmConfigCache()
        enablePlaygroundGateway()
        void startConfiguredLlmProxyIfNeeded()
      }
      return result
    }
  )

  ipcMain.handle('chat:llm-gateway:disable', async () => {
    clearPlaygroundGatewaySettings()
    stopOwnedProxy()
    invalidateLlmConfigCache()
    return { ok: true }
  })
}
