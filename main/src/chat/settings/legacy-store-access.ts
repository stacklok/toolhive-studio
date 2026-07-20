import Store from 'electron-store'
import type { ChatSettingsThread } from '../threads/types'
import type {
  ChatSettingsProvider,
  ChatSettingsSelectedModel,
} from './settings-service'
import { CHAT_PROVIDER_INFO } from '../constants'

type ProviderId = (typeof CHAT_PROVIDER_INFO)[number]['id']

interface ChatSettingsThreads {
  threads: Record<string, ChatSettingsThread>
  activeThreadId?: string
}

export interface LegacyChatSettings {
  providers: Record<ProviderId, ChatSettingsProvider>
  selectedModel: ChatSettingsSelectedModel
  enabledMcpTools: Record<string, string[]>
}

let threadsStore: Store<ChatSettingsThreads> | null = null
let chatSettingsStore: Store<LegacyChatSettings> | null = null

/** Lazy legacy threads store used for one-time reconciliation migration. */
export function getLegacyThreadsStore(): Store<ChatSettingsThreads> {
  if (!threadsStore) {
    threadsStore = new Store<ChatSettingsThreads>({
      name: 'chat-threads',
      encryptionKey: 'toolhive-threads-encryption-key',
      clearInvalidConfig: true,
      defaults: {
        threads: {},
        activeThreadId: undefined,
      },
    })
  }
  return threadsStore
}

/** Lazy legacy chat settings store used for one-time reconciliation migration. */
export function getLegacyChatSettingsStore(): Store<LegacyChatSettings> {
  if (!chatSettingsStore) {
    chatSettingsStore = new Store<LegacyChatSettings>({
      name: 'chat-settings',
      encryptionKey: 'toolhive-chat-encryption-key',
      clearInvalidConfig: true,
      defaults: {
        providers: {} as LegacyChatSettings['providers'],
        selectedModel: { provider: '', model: '' },
        enabledMcpTools: {},
      },
    })
  }
  return chatSettingsStore
}
