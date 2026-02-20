import Store from 'electron-store'
import log from '../logger'
import { getToolhivePort, isToolhiveRunning } from '../toolhive-manager'
import { createClient } from '@common/api/generated/client'
import { getApiV1BetaWorkloads } from '@common/api/generated/sdk.gen'
import type { CoreWorkload } from '@common/api/generated/types.gen'
import { getHeaders } from '../headers'
import { getTearingDownState } from '../app-state'
import { getToolhiveMcpInfo } from './mcp-tools'
import { TOOLHIVE_MCP_SERVER_NAME } from '../utils/constants'
import {
  CHAT_PROVIDER_INFO,
  LOCAL_PROVIDER_IDS,
  type LocalProviderId,
} from './constants'
import {
  writeProvider,
  deleteProvider,
  clearAllProviders,
  writeSelectedModel,
  writeEnabledMcpTools,
  deleteEnabledMcpTools,
} from '../db/writers/chat-settings-writer'
import {
  readChatProvider as readChatProviderFromDb,
  readSelectedModel as readSelectedModelFromDb,
  readEnabledMcpTools as readEnabledMcpToolsFromDb,
} from '../db/readers/chat-settings-reader'
import { getFeatureFlag } from '../feature-flags/flags'
import { featureFlagKeys } from '../../../utils/feature-flags'

// Extract provider IDs from CHAT_PROVIDER_INFO
type ProviderId = (typeof CHAT_PROVIDER_INFO)[number]['id']

// Helper to check if a provider is a local server
const isLocalProvider = (providerId: string): providerId is LocalProviderId =>
  LOCAL_PROVIDER_IDS.includes(providerId as LocalProviderId)

// Chat store types - discriminated union for provider settings
type ChatSettingsProvider =
  | {
      providerId: 'ollama' | 'lmstudio'
      endpointURL: string
      enabledTools: string[]
    }
  | {
      providerId: Exclude<ProviderId, 'ollama' | 'lmstudio'>
      apiKey: string
      enabledTools: string[]
    }

interface ChatSettingsSelectedModel {
  provider: string
  model: string
}

interface ChatSettings {
  providers: Record<ProviderId, ChatSettingsProvider>
  selectedModel: ChatSettingsSelectedModel
  enabledMcpTools: Record<string, string[]> // serverName -> [toolName1, toolName2]
}

// Type guard functions
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isProvidersRecord(value: unknown): value is ChatSettings['providers'] {
  if (!isRecord(value)) return false
  return Object.entries(value).every(([providerId, item]) => {
    if (!isRecord(item) || !isStringArray(item.enabledTools)) return false

    // Check if it's a local server provider (with endpointURL) or cloud provider (with apiKey)
    if (isLocalProvider(providerId)) {
      return typeof item.endpointURL === 'string'
    } else {
      return typeof item.apiKey === 'string'
    }
  })
}

function isToolsRecord(
  value: unknown
): value is ChatSettings['enabledMcpTools'] {
  if (!isRecord(value)) return false
  return Object.values(value).every((item) => isStringArray(item))
}

function isSelectedModel(value: unknown): value is ChatSettingsSelectedModel {
  return (
    isRecord(value) &&
    typeof value.provider === 'string' &&
    typeof value.model === 'string'
  )
}

// Create a secure store for chat settings (API keys and model selection)
export const chatSettingsStore = new Store<ChatSettings>({
  name: 'chat-settings',
  encryptionKey: 'toolhive-chat-encryption-key', // Basic encryption for API keys
  clearInvalidConfig: true,
  defaults: {
    providers: {},
    selectedModel: {
      provider: '',
      model: '',
    },
    enabledMcpTools: {},
  },
})

// Get chat settings for a provider
export function getChatSettings(providerId: ProviderId): ChatSettingsProvider {
  try {
    if (getFeatureFlag(featureFlagKeys.SQLITE_READS_CHAT_SETTINGS)) {
      try {
        const dbProvider = readChatProviderFromDb(providerId)
        if (dbProvider) {
          if (isLocalProvider(providerId)) {
            return {
              providerId,
              endpointURL: dbProvider.endpointURL ?? '',
              enabledTools: [],
            }
          } else {
            return {
              providerId,
              apiKey: dbProvider.apiKey ?? '',
              enabledTools: [],
            }
          }
        }
      } catch (err) {
        log.error(
          '[DB] SQLite read failed, falling back to electron-store:',
          err
        )
      }
    }
    const providers = chatSettingsStore.get('providers')
    if (isProvidersRecord(providers)) {
      const existing = providers[providerId]
      if (existing) return existing

      // Return default based on provider type
      if (isLocalProvider(providerId)) {
        return {
          providerId,
          endpointURL: '',
          enabledTools: [],
        }
      } else {
        return {
          providerId,
          apiKey: '',
          enabledTools: [],
        }
      }
    }

    // Fallback defaults
    if (isLocalProvider(providerId)) {
      return {
        providerId,
        endpointURL: '',
        enabledTools: [],
      }
    } else {
      return {
        providerId,
        apiKey: '',
        enabledTools: [],
      }
    }
  } catch (error) {
    log.error('Failed to get chat settings:', error)
    // Fallback defaults
    if (isLocalProvider(providerId)) {
      return {
        providerId,
        endpointURL: '',
        enabledTools: [],
      }
    } else {
      return {
        providerId,
        apiKey: '',
        enabledTools: [],
      }
    }
  }
}

// Helper functions for extracting credentials
const extractEndpointURL = (settings: ChatSettingsProvider): string =>
  isLocalProvider(settings.providerId) && 'endpointURL' in settings
    ? settings.endpointURL
    : ''

const extractApiKey = (settings: ChatSettingsProvider): string =>
  !isLocalProvider(settings.providerId) && 'apiKey' in settings
    ? settings.apiKey
    : ''

// Save chat settings for a provider
function saveChatSettings(
  providerId: ProviderId,
  settings: ChatSettingsProvider
): { success: boolean; error?: string } {
  try {
    // Ensure providerId matches the settings type
    const settingsWithProviderId: ChatSettingsProvider = isLocalProvider(
      providerId
    )
      ? {
          providerId,
          endpointURL: extractEndpointURL(settings),
          enabledTools: settings.enabledTools,
        }
      : {
          providerId,
          apiKey: extractApiKey(settings),
          enabledTools: settings.enabledTools,
        }

    const providers = chatSettingsStore.get('providers')
    const typedProviders = isProvidersRecord(providers) ? providers : {}
    typedProviders[providerId] = settingsWithProviderId
    chatSettingsStore.set('providers', typedProviders)
    try {
      if (isLocalProvider(providerId)) {
        writeProvider(providerId, {
          endpointURL: extractEndpointURL(settingsWithProviderId),
        })
      } else {
        writeProvider(providerId, {
          apiKey: extractApiKey(settingsWithProviderId),
        })
      }
    } catch (err) {
      log.error('[DB] Failed to dual-write provider settings:', err)
    }
    return { success: true }
  } catch (error) {
    log.error(
      `[CHAT] Failed to save settings for provider ${providerId}:`,
      error
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Clear chat settings for a provider
export function clearChatSettings(providerId?: ProviderId): {
  success: boolean
  error?: string
} {
  try {
    if (providerId) {
      const providers = chatSettingsStore.get('providers')
      const typedProviders = isProvidersRecord(providers) ? providers : {}
      delete typedProviders[providerId]
      chatSettingsStore.set('providers', typedProviders)
      try {
        deleteProvider(providerId)
      } catch (err) {
        log.error('[DB] Failed to dual-write provider deletion:', err)
      }
    } else {
      // Clear all providers if no specific provider is given
      chatSettingsStore.set('providers', {})
      try {
        clearAllProviders()
      } catch (err) {
        log.error('[DB] Failed to dual-write clear all providers:', err)
      }
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Get selected model
export function getSelectedModel(): ChatSettingsSelectedModel {
  try {
    if (getFeatureFlag(featureFlagKeys.SQLITE_READS_CHAT_SETTINGS)) {
      try {
        const dbModel = readSelectedModelFromDb()
        if (dbModel.provider && dbModel.model) return dbModel
      } catch (err) {
        log.error(
          '[DB] SQLite read failed, falling back to electron-store:',
          err
        )
      }
    }
    const selectedModel = chatSettingsStore.get('selectedModel')
    if (
      isSelectedModel(selectedModel) &&
      selectedModel.provider &&
      selectedModel.model
    ) {
      return selectedModel
    }
    return { provider: '', model: '' }
  } catch (error) {
    log.error('Failed to get selected model:', error)
    return { provider: '', model: '' }
  }
}

// Save selected model
export function saveSelectedModel(
  provider: string,
  model: string
): { success: boolean; error?: string } {
  try {
    chatSettingsStore.set('selectedModel', { provider, model })
    try {
      writeSelectedModel(provider, model)
    } catch (err) {
      log.error('[DB] Failed to dual-write selected model:', err)
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Save enabled MCP tools for a server
export function saveEnabledMcpTools(
  serverName: string,
  toolNames: string[]
): { success: boolean; error?: string } {
  try {
    const enabledMcpTools = chatSettingsStore.get('enabledMcpTools')
    const typedTools = isToolsRecord(enabledMcpTools) ? enabledMcpTools : {}
    typedTools[serverName] = toolNames
    chatSettingsStore.set('enabledMcpTools', typedTools)
    try {
      writeEnabledMcpTools(serverName, toolNames)
    } catch (err) {
      log.error('[DB] Failed to dual-write enabled MCP tools:', err)
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Get all enabled MCP tools (global) - filters out tools from stopped servers
export async function getEnabledMcpTools(): Promise<
  ChatSettings['enabledMcpTools']
> {
  try {
    if (getFeatureFlag(featureFlagKeys.SQLITE_READS_CHAT_SETTINGS)) {
      try {
        return readEnabledMcpToolsFromDb()
      } catch (err) {
        log.error(
          '[DB] SQLite read failed, falling back to electron-store:',
          err
        )
      }
    }
    const enabledMcpTools = chatSettingsStore.get('enabledMcpTools')
    if (!isToolsRecord(enabledMcpTools)) {
      return {}
    }

    // Skip validation during shutdown to prevent interrupting teardown
    if (getTearingDownState()) {
      log.debug('Skipping MCP tools validation during teardown')
      return enabledMcpTools
    }

    if (!isToolhiveRunning()) {
      // If ToolHive is not running, return stored tools without validation
      return enabledMcpTools
    }

    // Get running servers to filter out tools from stopped servers
    const port = getToolhivePort()
    try {
      const client = createClient({
        baseUrl: `http://localhost:${port}`,
        headers: getHeaders(),
      })

      const { data } = await getApiV1BetaWorkloads({
        client,
        query: { all: true },
      })

      const toolHiveMcpInfo = await getToolhiveMcpInfo()

      const runningServerNames = (data?.workloads || [])
        .filter((w: CoreWorkload) => w.status === 'running')
        .map((w: CoreWorkload) => w.name)

      const internalMcpServerName = toolHiveMcpInfo.isRunning
        ? [TOOLHIVE_MCP_SERVER_NAME]
        : []

      // Filter enabled tools to only include tools from running servers
      const filteredTools: ChatSettings['enabledMcpTools'] = {}
      const serversToRemove: string[] = []

      for (const [serverName, tools] of Object.entries(enabledMcpTools)) {
        if (
          runningServerNames.includes(serverName) ||
          internalMcpServerName.includes(serverName)
        ) {
          filteredTools[serverName] = tools
        } else if (tools.length > 0) {
          // Only log if server actually had tools to clean up
          log.info(`Cleaning up tools for stopped server: ${serverName}`)
          serversToRemove.push(serverName)
        }
      }

      // Remove stopped servers from storage in one operation
      if (serversToRemove.length > 0) {
        const updatedTools = { ...enabledMcpTools }
        for (const serverName of serversToRemove) {
          delete updatedTools[serverName]
        }
        chatSettingsStore.set('enabledMcpTools', updatedTools)
        for (const serverName of serversToRemove) {
          try {
            deleteEnabledMcpTools(serverName)
          } catch (err) {
            log.error('[DB] Failed to dual-write MCP tools cleanup:', err)
          }
        }
      }

      return filteredTools
    } catch (apiError) {
      log.warn(
        'Failed to check running servers tools, returning stored tools:',
        apiError
      )
      // During shutdown, just return stored tools without validation
      return enabledMcpTools
    }
  } catch (error) {
    log.error('Failed to get all enabled MCP tools:', error)
    return {}
  }
}

// Get enabled MCP servers from tools (get servers that have enabled tools)
export async function getEnabledMcpServersFromTools(): Promise<string[]> {
  try {
    const allEnabledTools = await getEnabledMcpTools()
    const enabledServerNames = Object.keys(allEnabledTools).filter(
      (serverName) => {
        const tools = allEnabledTools[serverName]
        return tools && tools.length > 0
      }
    )
    return enabledServerNames
  } catch (error) {
    log.error('Failed to get enabled MCP servers from tools:', error)
    return []
  }
}

// Handler for IPC save settings - handles conversion and validation
export function handleSaveSettings(
  providerId: string,
  settings:
    | { apiKey: string; enabledTools: string[] }
    | { endpointURL: string; enabledTools: string[] }
): { success: boolean; error?: string } {
  const providerIdTyped = providerId as ProviderId

  const credentialValue =
    providerIdTyped === 'ollama' || providerIdTyped === 'lmstudio'
      ? 'endpointURL' in settings
        ? settings.endpointURL
        : ''
      : 'apiKey' in settings
        ? settings.apiKey
        : ''

  if (!credentialValue || !credentialValue.trim()) {
    return clearChatSettings(providerIdTyped)
  }

  const chatSettingsProvider: ChatSettingsProvider =
    providerIdTyped === 'ollama' || providerIdTyped === 'lmstudio'
      ? {
          providerId: providerIdTyped,
          endpointURL: credentialValue,
          enabledTools: settings.enabledTools,
        }
      : {
          providerId: providerIdTyped as Exclude<
            ProviderId,
            'ollama' | 'lmstudio'
          >,
          apiKey: credentialValue,
          enabledTools: settings.enabledTools,
        }
  return saveChatSettings(providerIdTyped, chatSettingsProvider)
}
