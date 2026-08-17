import {
  clearChatSettings,
  getChatSettings,
  getSelectedModel,
  handleSaveSettings,
  saveSelectedModel,
} from '../../settings-storage'
import { THV_LLM_PLAYGROUND_ENABLED_MARKER, THV_LLM_PROVIDER_ID } from './types'

export function isPlaygroundGatewayEnabled(): boolean {
  const settings = getChatSettings(THV_LLM_PROVIDER_ID)
  return Boolean('endpointURL' in settings && settings.endpointURL.trim())
}

/** If the user already selected this provider, persist Playground opt-in. */
export function migratePlaygroundGatewayEnablement(): void {
  const selected = getSelectedModel()
  if (selected.provider !== THV_LLM_PROVIDER_ID) {
    return
  }
  if (isPlaygroundGatewayEnabled()) {
    return
  }
  enablePlaygroundGateway()
}

export function enablePlaygroundGateway(): void {
  handleSaveSettings(THV_LLM_PROVIDER_ID, {
    endpointURL: THV_LLM_PLAYGROUND_ENABLED_MARKER,
    enabledTools: [],
  })
}

export function clearPlaygroundGatewaySettings(): void {
  clearChatSettings(THV_LLM_PROVIDER_ID)
  const selected = getSelectedModel()
  if (selected.provider === THV_LLM_PROVIDER_ID) {
    saveSelectedModel('', '')
  }
}
