import Store from 'electron-store'
import log from '../logger'
import { getToolhivePort } from '../toolhive-manager'
import { createClient } from '@api/client'
import { getApiV1BetaWorkloads } from '@api/sdk.gen'
import type { CoreWorkload } from '@api/types.gen'
import { getHeaders } from '../headers'
import { getTearingDownState } from '../app-state'

// Chat store types
export interface ChatSettingsProvider {
  apiKey: string
  enabledTools: string[]
}

export interface ChatSettingsSelectedModel {
  provider: string
  model: string
}

export interface ChatSettings {
  providers: Record<string, ChatSettingsProvider>
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
  return Object.values(value).every(
    (item) =>
      isRecord(item) &&
      typeof item.apiKey === 'string' &&
      isStringArray(item.enabledTools)
  )
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
const chatStore = new Store<ChatSettings>({
  name: 'chat-settings',
  encryptionKey: 'toolhive-chat-encryption-key', // Basic encryption for API keys
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
export function getChatSettings(providerId: string): ChatSettingsProvider {
  try {
    const providers = chatStore.get('providers')
    if (isProvidersRecord(providers)) {
      return providers[providerId] || { apiKey: '', enabledTools: [] }
    }
    return { apiKey: '', enabledTools: [] }
  } catch (error) {
    log.error('Failed to get chat settings:', error)
    return { apiKey: '', enabledTools: [] }
  }
}

// Save chat settings for a provider
export function saveChatSettings(
  providerId: string,
  settings: ChatSettingsProvider
): { success: boolean; error?: string } {
  try {
    const providers = chatStore.get('providers')
    const typedProviders = isProvidersRecord(providers) ? providers : {}
    typedProviders[providerId] = settings
    chatStore.set('providers', typedProviders)
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
export function clearChatSettings(providerId?: string): {
  success: boolean
  error?: string
} {
  try {
    if (providerId) {
      const providers = chatStore.get('providers')
      const typedProviders = isProvidersRecord(providers) ? providers : {}
      delete typedProviders[providerId]
      chatStore.set('providers', typedProviders)
    } else {
      // Clear all providers if no specific provider is given
      chatStore.set('providers', {})
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
    const selectedModel = chatStore.get('selectedModel')
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
    chatStore.set('selectedModel', { provider, model })
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
    const enabledMcpTools = chatStore.get('enabledMcpTools')
    const typedTools = isToolsRecord(enabledMcpTools) ? enabledMcpTools : {}
    // Store tools with their vanilla names
    typedTools[serverName] = toolNames
    chatStore.set('enabledMcpTools', typedTools)
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
    const enabledMcpTools = chatStore.get('enabledMcpTools')
    if (!isToolsRecord(enabledMcpTools)) {
      return {}
    }

    // Skip validation during shutdown to prevent interrupting teardown
    if (getTearingDownState()) {
      log.debug('Skipping MCP tools validation during teardown')
      return enabledMcpTools
    }

    // Get running servers to filter out tools from stopped servers
    const port = getToolhivePort()

    if (!port) {
      // If ToolHive is not running, return stored tools without validation
      return enabledMcpTools
    }

    try {
      const client = createClient({
        baseUrl: `http://localhost:${port}`,
        headers: getHeaders(),
      })

      const { data } = await getApiV1BetaWorkloads({
        client,
        query: { all: true },
      })

      const runningServerNames = (data?.workloads || [])
        .filter((w: CoreWorkload) => w.status === 'running')
        .map((w: CoreWorkload) => w.name)

      // Filter enabled tools to only include tools from running servers
      const filteredTools: ChatSettings['enabledMcpTools'] = {}
      const serversToRemove: string[] = []

      for (const [serverName, tools] of Object.entries(enabledMcpTools)) {
        if (runningServerNames.includes(serverName)) {
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
        chatStore.set('enabledMcpTools', updatedTools)
      }

      return filteredTools
    } catch (apiError) {
      log.warn(
        'Failed to check running servers during shutdown, returning stored tools:',
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
    // Return server IDs in the format expected by the UI
    return enabledServerNames.map((serverName) => `mcp_${serverName}`)
  } catch (error) {
    log.error('Failed to get enabled MCP servers from tools:', error)
    return []
  }
}
