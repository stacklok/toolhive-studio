import Store from 'electron-store'
import log from '../logger'

// Type guard functions
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isProvidersRecord(
  value: unknown
): value is Record<string, ChatSettings> {
  if (!isRecord(value)) return false
  return Object.values(value).every(
    (item) =>
      isRecord(item) &&
      typeof item.apiKey === 'string' &&
      isStringArray(item.enabledTools)
  )
}

function isToolsRecord(value: unknown): value is Record<string, string[]> {
  if (!isRecord(value)) return false
  return Object.values(value).every((item) => isStringArray(item))
}

function isSelectedModel(
  value: unknown
): value is { provider: string; model: string } {
  return (
    isRecord(value) &&
    typeof value.provider === 'string' &&
    typeof value.model === 'string'
  )
}

// Create a secure store for chat settings (API keys and model selection)
const chatStore = new Store({
  name: 'chat-settings',
  encryptionKey: 'toolhive-chat-encryption-key', // Basic encryption for API keys
  defaults: {
    providers: {} as Record<
      string,
      {
        apiKey: string
        enabledTools: string[]
      }
    >,
    selectedModel: {
      provider: '',
      model: '',
    },
    // Individual tool enablement per server (single source of truth)
    enabledMcpTools: {} as Record<string, string[]>, // serverName -> [toolName1, toolName2]
  },
})

// Chat settings interface
interface ChatSettings {
  apiKey: string
  enabledTools: string[]
}

// Get chat settings for a provider
export function getChatSettings(providerId: string): ChatSettings {
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
  settings: ChatSettings
): { success: boolean; error?: string } {
  try {
    const providers = chatStore.get('providers')
    const typedProviders = isProvidersRecord(providers) ? providers : {}
    typedProviders[providerId] = settings
    chatStore.set('providers', typedProviders)
    return { success: true }
  } catch (error) {
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
export function getSelectedModel(): { provider: string; model: string } {
  try {
    const selectedModel = chatStore.get('selectedModel')
    if (isSelectedModel(selectedModel)) {
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

// Get enabled MCP tools for a specific server
// function getEnabledMcpToolsForServer(serverName: string): string[] {
//   try {
//     const enabledMcpTools = chatStore.get('enabledMcpTools')
//     if (isToolsRecord(enabledMcpTools)) {
//       return enabledMcpTools[serverName] || []
//     }
//     return []
//   } catch (error) {
//     log.error('Failed to get enabled MCP tools:', error)
//     return []
//   }
// }

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

// Get all enabled MCP tools (global)
export function getEnabledMcpTools(): Record<string, string[]> {
  try {
    const enabledMcpTools = chatStore.get('enabledMcpTools')
    if (isToolsRecord(enabledMcpTools)) {
      return enabledMcpTools
    }
    return {}
  } catch (error) {
    log.error('Failed to get all enabled MCP tools:', error)
    return {}
  }
}

// Get enabled MCP servers from tools (get servers that have enabled tools)
export function getEnabledMcpServersFromTools(): string[] {
  try {
    const allEnabledTools = getEnabledMcpTools()
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
