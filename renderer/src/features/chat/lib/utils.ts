import type { ChatSettings } from '../types'

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

/**
 * "Harness" providers (currently just the Cursor CLI agent, via ACP) run
 * their own tool-calling loop instead of exposing a plain text-completion
 * model — they're grouped separately in the model picker and don't need
 * manual credentials (registration with ToolHive happens automatically).
 */
export function isHarnessProvider(provider: string): provider is 'acp' {
  return provider === 'acp'
}

/** ToolHive group harness providers get registered into. */
export const HARNESS_GROUP_NAME = 'default'

const HARNESS_CLIENT_TYPES: Record<string, string> = {
  acp: 'cursor',
}

/**
 * The ToolHive client type (as returned by the discovery-clients API) that
 * backs a harness provider — e.g. the `acp` provider is really the `cursor`
 * CLI. A harness provider is only usable when this client is installed.
 */
export function getHarnessClientType(provider: string): string | undefined {
  return HARNESS_CLIENT_TYPES[provider]
}
