import { ipcRenderer } from 'electron'
import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import type { UIMessage } from 'ai'
import type {
  AvailableServer,
  ChatUIMessage,
  ChatRequest,
} from '../../../main/src/chat/types'

export const chatApi = {
  chat: {
    getProviders: () => ipcRenderer.invoke('chat:get-providers'),
    fetchProviderModels: (providerId: string, tempCredential?: string) =>
      ipcRenderer.invoke(
        'chat:fetch-provider-models',
        providerId,
        tempCredential
      ),
    stream: (request: ChatRequest) =>
      ipcRenderer.invoke('chat:stream', request) as Promise<{
        streamId: string
      }>,
    getSettings: (providerId: string) =>
      ipcRenderer.invoke('chat:get-settings', providerId),
    saveSettings: (
      providerId: string,
      settings:
        | { apiKey: string; enabledTools: string[] }
        | { endpointURL: string; enabledTools: string[] }
    ) => ipcRenderer.invoke('chat:save-settings', providerId, settings),
    clearSettings: (providerId?: string) =>
      ipcRenderer.invoke('chat:clear-settings', providerId),
    discoverModels: () => ipcRenderer.invoke('chat:discover-models'),
    getSelectedModel: () => ipcRenderer.invoke('chat:get-selected-model'),
    saveSelectedModel: (provider: string, model: string) =>
      ipcRenderer.invoke('chat:save-selected-model', provider, model),
    getMcpServerTools: (serverName: string) =>
      ipcRenderer.invoke('chat:get-mcp-server-tools', serverName),
    getEnabledMcpTools: () => ipcRenderer.invoke('chat:get-enabled-mcp-tools'),
    getEnabledMcpServersFromTools: () =>
      ipcRenderer.invoke('chat:get-enabled-mcp-servers-from-tools'),
    saveEnabledMcpTools: (serverName: string, enabledTools: string[]) =>
      ipcRenderer.invoke(
        'chat:save-enabled-mcp-tools',
        serverName,
        enabledTools
      ),
    getToolhiveMcpInfo: () => ipcRenderer.invoke('chat:get-toolhive-mcp-info'),

    createThread: (title?: string, initialMessages?: unknown[]) =>
      ipcRenderer.invoke('chat:create-thread', title, initialMessages),
    getThread: (threadId: string) =>
      ipcRenderer.invoke('chat:get-thread', threadId),
    getAllThreads: () => ipcRenderer.invoke('chat:get-all-threads'),
    updateThread: (threadId: string, updates: unknown) =>
      ipcRenderer.invoke('chat:update-thread', threadId, updates),
    deleteThread: (threadId: string) =>
      ipcRenderer.invoke('chat:delete-thread', threadId),
    clearAllThreads: () => ipcRenderer.invoke('chat:clear-all-threads'),
    getThreadCount: () => ipcRenderer.invoke('chat:get-thread-count'),

    addMessageToThread: (threadId: string, message: unknown) =>
      ipcRenderer.invoke('chat:add-message-to-thread', threadId, message),
    updateThreadMessages: (threadId: string, messages: ChatUIMessage[]) =>
      ipcRenderer.invoke('chat:update-thread-messages', threadId, messages),

    getActiveThreadId: () => ipcRenderer.invoke('chat:get-active-thread-id'),
    setActiveThreadId: (threadId?: string) =>
      ipcRenderer.invoke('chat:set-active-thread-id', threadId),

    createChatThread: (title?: string, initialUserMessage?: string) =>
      ipcRenderer.invoke('chat:create-chat-thread', title, initialUserMessage),
    getThreadMessagesForTransport: (threadId: string) =>
      ipcRenderer.invoke('chat:get-thread-messages-for-transport', threadId),
    getThreadInfo: (threadId: string) =>
      ipcRenderer.invoke('chat:get-thread-info', threadId),
    ensureThreadExists: (threadId?: string, title?: string) =>
      ipcRenderer.invoke('chat:ensure-thread-exists', threadId, title),
    generateThreadTitle: (threadId: string) =>
      ipcRenderer.invoke('chat:generate-thread-title', threadId),
  },
}

export interface ChatAPI {
  chat: {
    getProviders: () => Promise<
      Array<{ id: string; name: string; models: string[] }>
    >
    fetchProviderModels: (
      providerId: string,
      tempCredential?: string
    ) => Promise<{ id: string; name: string; models: string[] } | null>
    stream: (
      request:
        | {
            chatId: string
            messages: ChatUIMessage[]
            provider: 'ollama' | 'lmstudio'
            model: string
            endpointURL: string
            enabledTools?: string[]
          }
        | {
            chatId: string
            messages: ChatUIMessage[]
            provider: string
            model: string
            apiKey: string
            enabledTools?: string[]
          }
    ) => Promise<{ streamId: string }>
    getSettings: (providerId: string) => Promise<
      | {
          providerId: 'ollama' | 'lmstudio'
          endpointURL: string
          enabledTools: string[]
        }
      | { providerId: string; apiKey: string; enabledTools: string[] }
    >
    saveSettings: (
      providerId: string,
      settings:
        | { apiKey: string; enabledTools: string[] }
        | { endpointURL: string; enabledTools: string[] }
    ) => Promise<{ success: boolean; error?: string }>
    clearSettings: (
      providerId?: string
    ) => Promise<{ success: boolean; error?: string }>
    discoverModels: () => Promise<{
      providers: Array<{
        id: string
        name: string
        models: Array<{
          id: string
          supportsTools: boolean
          category?: string
          experimental?: boolean
        }>
      }>
      discoveredAt: string
    }>
    getSelectedModel: () => Promise<{ provider: string; model: string }>
    saveSelectedModel: (
      provider: string,
      model: string
    ) => Promise<{ success: boolean; error?: string }>
    getMcpServerTools: (serverId: string) => Promise<AvailableServer>
    getEnabledMcpTools: () => Promise<Record<string, string[]>>
    getEnabledMcpServersFromTools: () => Promise<string[]>
    saveEnabledMcpTools: (
      serverName: string,
      enabledTools: string[]
    ) => Promise<{ success: boolean; error?: string }>
    getToolhiveMcpInfo: () => Promise<AvailableServer>

    createThread: (
      title?: string,
      initialMessages?: unknown[]
    ) => Promise<{
      success: boolean
      threadId?: string
      error?: string
    }>
    getThread: (threadId: string) => Promise<{
      id: string
      title?: string
      titleEditedByUser?: boolean
      starred?: boolean
      messages: ChatUIMessage[]
      lastEditTimestamp: number
      createdAt: number
    } | null>
    getAllThreads: () => Promise<
      Array<{
        id: string
        title?: string
        titleEditedByUser?: boolean
        starred?: boolean
        messages: ChatUIMessage[]
        lastEditTimestamp: number
        createdAt: number
      }>
    >
    updateThread: (
      threadId: string,
      updates: unknown
    ) => Promise<{
      success: boolean
      error?: string
    }>
    deleteThread: (threadId: string) => Promise<{
      success: boolean
      error?: string
    }>
    clearAllThreads: () => Promise<{
      success: boolean
      error?: string
    }>
    getThreadCount: () => Promise<number>

    addMessageToThread: (
      threadId: string,
      message: unknown
    ) => Promise<{
      success: boolean
      error?: string
    }>
    updateThreadMessages: (
      threadId: string,
      messages: ChatUIMessage[]
    ) => Promise<{
      success: boolean
      error?: string
    }>

    getActiveThreadId: () => Promise<string | undefined>
    setActiveThreadId: (threadId?: string) => Promise<{
      success: boolean
      error?: string
    }>

    createChatThread: (
      title?: string,
      initialUserMessage?: string
    ) => Promise<{
      success: boolean
      threadId?: string
      error?: string
    }>
    getThreadMessagesForTransport: (threadId: string) => Promise<
      UIMessage<{
        createdAt?: number
        model?: string
        totalUsage?: LanguageModelV2Usage
        responseTime?: number
        finishReason?: string
      }>[]
    >
    getThreadInfo: (threadId: string) => Promise<{
      thread: {
        id: string
        title?: string
        messages: ChatUIMessage[]
        lastEditTimestamp: number
        createdAt: number
      } | null
      messageCount: number
      lastActivity: Date | null
      hasUserMessages: boolean
      hasAssistantMessages: boolean
    }>
    ensureThreadExists: (
      threadId?: string,
      title?: string
    ) => Promise<{
      success: boolean
      threadId?: string
      error?: string
      isNew?: boolean
    }>
    generateThreadTitle: (threadId: string) => Promise<{
      success: boolean
      title?: string
      error?: string
    }>
  }
}
