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
import { telemetryStore } from '../telemetry-store'
import { autoUpdateStore } from '../auto-update'
import { quitConfirmationStore } from '../quit-confirmation'
import { featureFlagStore } from '../feature-flags/flags'
import { chatSettingsStore } from '../chat/settings-storage'
import { threadsStore } from '../chat/threads-storage'
import { shutdownStore } from '../graceful-exit'

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

  const dbThreadIds = new Set(
    (db.prepare('SELECT id FROM threads').all() as { id: string }[]).map(
      (row) => row.id
    )
  )

  const storeThreadIds = new Set<string>()

  for (const [threadId, thread] of Object.entries(threads)) {
    if (!thread || typeof thread !== 'object') continue
    const t = thread as ChatSettingsThread
    storeThreadIds.add(threadId)
    writeThread(t)
  }

  // Remove threads from SQLite that no longer exist in electron-store
  for (const dbId of dbThreadIds) {
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
