import { TOOLHIVE_MCP_SERVER_NAME } from './constants'
import type { ChatSettings } from '../types'

export const getNormalizedServerName = (serverName: string) => {
  if (serverName === TOOLHIVE_MCP_SERVER_NAME) {
    return 'toolhive mcp'
  }
  return serverName
}

type ProviderSettings =
  | {
      providerId: 'ollama' | 'lmstudio'
      endpointURL: string
      enabledTools: string[]
    }
  | { providerId: string; apiKey: string; enabledTools: string[] }

type CredentialSettings = ChatSettings | ProviderSettings

function hasApiKey(
  settings: CredentialSettings
): settings is Extract<CredentialSettings, { apiKey: string }> {
  return 'apiKey' in settings
}

export function hasCredentials(
  settings: CredentialSettings,
  validate = false
): boolean {
  if (hasApiKey(settings)) {
    return validate
      ? Boolean(settings.apiKey && settings.apiKey.trim())
      : Boolean(settings.apiKey)
  }
  return validate
    ? Boolean(settings.endpointURL && settings.endpointURL.trim())
    : Boolean(settings.endpointURL)
}

export function hasValidCredentials(settings: CredentialSettings): boolean {
  return hasCredentials(settings, true)
}

export function isLocalServerSettings(settings: ProviderSettings): settings is {
  providerId: 'ollama' | 'lmstudio'
  endpointURL: string
  enabledTools: string[]
} {
  return (
    (settings.providerId === 'ollama' || settings.providerId === 'lmstudio') &&
    'endpointURL' in settings
  )
}

export function providerHasApiKey(
  settings: ProviderSettings
): settings is { providerId: string; apiKey: string; enabledTools: string[] } {
  return 'apiKey' in settings
}

export function isLocalServerProvider(
  provider: string
): provider is 'ollama' | 'lmstudio' {
  return provider === 'ollama' || provider === 'lmstudio'
}
