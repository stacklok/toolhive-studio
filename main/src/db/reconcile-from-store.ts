import Store from 'electron-store'
import type Database from 'better-sqlite3'
import { getDb, isDbWritable } from './database'
import { writeSetting } from './writers/settings-writer'
import { writeFeatureFlag } from './writers/feature-flags-writer'
import {
  writeProvider,
  writeSelectedModel,
  writeEnabledMcpTools,
} from './writers/chat-settings-writer'
import {
  writeThread,
  deleteThreadFromDb,
  writeActiveThread,
} from './writers/threads-writer'
import { writeShutdownServers } from './writers/shutdown-writer'
import log from '../logger'
import type { ChatSettingsThread } from '../chat/threads-storage'

// Re-create store references for reading (these match the stores in each module)
const telemetryStore = new Store<{ isTelemetryEnabled: boolean }>({
  defaults: { isTelemetryEnabled: true },
})

const autoUpdateStore = new Store<{ isAutoUpdateEnabled: boolean }>({
  name: 'auto-update',
  defaults: { isAutoUpdateEnabled: true },
})

const quitConfirmationStore = new Store<{ skipQuitConfirmation: boolean }>({
  name: 'quit-confirmation',
  defaults: { skipQuitConfirmation: false },
})

const featureFlagStore = new Store<Record<string, boolean>>({
  name: 'feature-flags',
  defaults: {},
})

const chatSettingsStore = new Store<{
  providers: Record<string, unknown>
  selectedModel: { provider: string; model: string }
  enabledMcpTools: Record<string, string[]>
}>({
  name: 'chat-settings',
  encryptionKey: 'toolhive-chat-encryption-key',
  clearInvalidConfig: true,
  defaults: {
    providers: {},
    selectedModel: { provider: '', model: '' },
    enabledMcpTools: {},
  },
})

const threadsStore = new Store<{
  threads: Record<string, ChatSettingsThread>
  activeThreadId?: string
}>({
  name: 'chat-threads',
  encryptionKey: 'toolhive-threads-encryption-key',
  clearInvalidConfig: true,
  defaults: {
    threads: {},
    activeThreadId: undefined,
  },
})

const shutdownStore = new Store({
  name: 'server-shutdown',
  defaults: { lastShutdownServers: [] as unknown[] },
})

function syncSettings(): void {
  const telemetryEnabled = telemetryStore.get('isTelemetryEnabled', true)
  writeSetting('isTelemetryEnabled', String(telemetryEnabled))

  const autoUpdateEnabled = autoUpdateStore.get('isAutoUpdateEnabled', true)
  writeSetting('isAutoUpdateEnabled', String(autoUpdateEnabled))

  const skipQuitConfirmation = quitConfirmationStore.get(
    'skipQuitConfirmation',
    false
  )
  writeSetting('skipQuitConfirmation', String(skipQuitConfirmation))
}

function syncFeatureFlags(): void {
  const allFlags = featureFlagStore.store
  for (const [key, value] of Object.entries(allFlags)) {
    writeFeatureFlag(key, value)
  }
}

function syncChatProviders(): void {
  const providers = chatSettingsStore.get('providers')
  if (!providers || typeof providers !== 'object') return

  for (const [providerId, settings] of Object.entries(providers)) {
    if (!settings || typeof settings !== 'object') continue
    const s = settings as Record<string, unknown>

    writeProvider(providerId, {
      apiKey: typeof s.apiKey === 'string' ? s.apiKey : undefined,
      endpointURL:
        typeof s.endpointURL === 'string' ? s.endpointURL : undefined,
    })
  }
}

function syncSelectedModel(): void {
  const selectedModel = chatSettingsStore.get('selectedModel')
  if (
    selectedModel &&
    typeof selectedModel.provider === 'string' &&
    typeof selectedModel.model === 'string'
  ) {
    writeSelectedModel(selectedModel.provider, selectedModel.model)
  }
}

function syncEnabledMcpTools(): void {
  const enabledMcpTools = chatSettingsStore.get('enabledMcpTools')
  if (!enabledMcpTools || typeof enabledMcpTools !== 'object') return

  for (const [serverName, tools] of Object.entries(enabledMcpTools)) {
    if (Array.isArray(tools)) {
      writeEnabledMcpTools(serverName, tools)
    }
  }
}

function syncShutdownServers(): void {
  const servers = shutdownStore.get('lastShutdownServers', [])
  if (Array.isArray(servers)) {
    writeShutdownServers(servers as never[])
  }
}

function syncThreads(db: Database.Database): void {
  const threads = threadsStore.get('threads')
  if (!threads || typeof threads !== 'object') return

  // Get all timestamps from SQLite in one query
  const dbTimestamps = new Map(
    (
      db.prepare('SELECT id, last_edit_timestamp FROM threads').all() as {
        id: string
        last_edit_timestamp: number
      }[]
    ).map((row) => [row.id, row.last_edit_timestamp])
  )

  const storeThreadIds = new Set<string>()

  for (const [threadId, thread] of Object.entries(threads)) {
    if (!thread || typeof thread !== 'object') continue
    const t = thread as ChatSettingsThread
    storeThreadIds.add(threadId)

    // Only upsert if the thread is new or has changed
    const dbTimestamp = dbTimestamps.get(threadId)
    if (dbTimestamp === t.lastEditTimestamp) continue

    writeThread(t)
  }

  // Remove threads from SQLite that no longer exist in electron-store
  for (const [dbId] of dbTimestamps) {
    if (!storeThreadIds.has(dbId)) {
      deleteThreadFromDb(dbId)
    }
  }

  // Sync active thread
  const activeThreadId = threadsStore.get('activeThreadId')
  writeActiveThread(activeThreadId)
}

export function reconcileFromStore(): void {
  if (!isDbWritable()) {
    log.info('[DB] Database not writable, skipping reconciliation')
    return
  }

  const db = getDb()
  log.info('[DB] Reconciling SQLite from electron-store...')

  try {
    db.transaction(() => {
      syncSettings()
      syncFeatureFlags()
      syncChatProviders()
      syncSelectedModel()
      syncEnabledMcpTools()
      syncShutdownServers()
      syncThreads(db)
    })()
    log.info('[DB] Reconciliation complete')
  } catch (err) {
    log.error('[DB] Reconciliation failed:', err)
  }
}
