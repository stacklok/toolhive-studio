import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createTestDb } from './test-helpers'

let testDb: Database.Database

const { mockStoreData, createMockStore } = vi.hoisted(() => {
  const mockStoreData = {} as Record<string, Record<string, unknown>>
  const createMockStore = (storeName: string) => ({
    get: vi.fn((key: string, defaultValue?: unknown) => {
      const data = mockStoreData[storeName] || {}
      return key in data ? data[key] : defaultValue
    }),
    set: vi.fn(),
    delete: vi.fn(),
    get store() {
      return mockStoreData[storeName] || {}
    },
  })
  return { mockStoreData, createMockStore }
})

vi.mock('electron-store', () => {
  return {
    default: vi.fn().mockImplementation(function ElectronStore(opts?: {
      name?: string
    }) {
      const storeName = opts?.name || 'default'
      return {
        get: vi.fn((key: string, defaultValue?: unknown) => {
          const data = mockStoreData[storeName] || {}
          return key in data ? data[key] : defaultValue
        }),
        set: vi.fn(),
        delete: vi.fn(),
        get store() {
          return mockStoreData[storeName] || {}
        },
      }
    }),
  }
})

vi.mock('../database', () => ({
  getDb: () => testDb,
  isDbWritable: () => true,
  setDbWritable: vi.fn(),
}))

vi.mock('../encryption', () => ({
  encryptSecret: (plaintext: string) => Buffer.from(plaintext, 'utf-8'),
  decryptSecret: (encrypted: Buffer) => encrypted.toString('utf-8'),
}))

vi.mock('../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => ':memory:') },
}))

// Mock heavy source modules to avoid their transitive deps (electron full API, sentry, etc.)
vi.mock('../../auto-update', () => ({
  autoUpdateStore: createMockStore('auto-update'),
}))
vi.mock('../../quit-confirmation', () => ({
  quitConfirmationStore: createMockStore('quit-confirmation'),
}))
vi.mock('../../chat/settings-storage', () => ({
  chatSettingsStore: createMockStore('chat-settings'),
}))
vi.mock('../../graceful-exit', () => ({
  shutdownStore: createMockStore('server-shutdown'),
}))

import { reconcileFromStore } from '../reconcile-from-store'

beforeEach(() => {
  testDb = createTestDb()

  Object.keys(mockStoreData).forEach((key) => delete mockStoreData[key])
})

afterEach(() => {
  testDb.close()
})

describe('reconcileFromStore', () => {
  it('syncs settings from electron-store to SQLite', () => {
    mockStoreData['default'] = { isTelemetryEnabled: false }
    mockStoreData['auto-update'] = { isAutoUpdateEnabled: false }
    mockStoreData['quit-confirmation'] = { skipQuitConfirmation: true }

    reconcileFromStore()

    const settings = testDb.prepare('SELECT * FROM settings').all() as {
      key: string
      value: string
    }[]
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]))

    expect(settingsMap.get('isTelemetryEnabled')).toBe('false')
    expect(settingsMap.get('isAutoUpdateEnabled')).toBe('false')
    expect(settingsMap.get('skipQuitConfirmation')).toBe('true')
  })

  it('syncs feature flags from electron-store to SQLite', () => {
    mockStoreData['feature-flags'] = {
      feature_flag_meta_optimizer: true,
    }

    reconcileFromStore()

    const flags = testDb.prepare('SELECT * FROM feature_flags').all() as {
      key: string
      enabled: number
    }[]
    expect(flags.length).toBeGreaterThanOrEqual(1)
    const metaFlag = flags.find((f) => f.key === 'feature_flag_meta_optimizer')
    expect(metaFlag?.enabled).toBe(1)
  })

  it('syncs AI providers with encrypted secrets', () => {
    mockStoreData['chat-settings'] = {
      providers: {
        openai: { apiKey: 'sk-test-key', enabledTools: ['tool1'] },
        ollama: { endpointURL: 'http://localhost:11434', enabledTools: [] },
      },
      selectedModel: { provider: 'openai', model: 'gpt-4' },
      enabledMcpTools: { server1: ['toolA'] },
    }

    reconcileFromStore()

    const providers = testDb.prepare('SELECT * FROM ai_providers').all() as {
      provider_id: string
      api_key_enc: Buffer | null
      endpoint_url_enc: Buffer | null
    }[]
    expect(providers).toHaveLength(2)

    const openai = providers.find((p) => p.provider_id === 'openai')
    expect(openai?.api_key_enc?.toString()).toBe('sk-test-key')

    const model = testDb
      .prepare('SELECT * FROM selected_model WHERE id = 1')
      .get() as { provider: string; model: string }
    expect(model.provider).toBe('openai')
    expect(model.model).toBe('gpt-4')

    const tools = testDb.prepare('SELECT * FROM enabled_mcp_tools').all() as {
      server_name: string
      tool_names: string
    }[]
    expect(tools).toHaveLength(1)
    expect(tools[0]!.server_name).toBe('server1')
  })

  it('syncs threads and skips unchanged threads based on timestamp', () => {
    testDb
      .prepare(
        "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('t1', 'Old', 1000, 1000)"
      )
      .run()

    mockStoreData['chat-threads'] = {
      threads: {
        t1: {
          id: 't1',
          title: 'Old',
          createdAt: 1000,
          lastEditTimestamp: 1000,
          messages: [],
        },
        t2: {
          id: 't2',
          title: 'New Thread',
          createdAt: 2000,
          lastEditTimestamp: 2000,
          messages: [
            { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
          ],
        },
      },
      activeThreadId: 't2',
    }

    reconcileFromStore()

    const threads = testDb
      .prepare('SELECT * FROM threads ORDER BY id')
      .all() as { id: string; title: string }[]
    expect(threads).toHaveLength(2)

    const t2Messages = testDb
      .prepare("SELECT * FROM thread_messages WHERE thread_id = 't2'")
      .all()
    expect(t2Messages).toHaveLength(1)

    const active = testDb
      .prepare('SELECT thread_id FROM active_thread WHERE id = 1')
      .get() as { thread_id: string }
    expect(active.thread_id).toBe('t2')
  })

  it('removes threads from SQLite that no longer exist in electron-store', () => {
    testDb
      .prepare(
        "INSERT INTO threads (id, title, created_at, last_edit_timestamp) VALUES ('deleted', 'Gone', 1000, 1000)"
      )
      .run()

    mockStoreData['chat-threads'] = {
      threads: {},
      activeThreadId: undefined,
    }

    reconcileFromStore()

    const threads = testDb.prepare('SELECT * FROM threads').all()
    expect(threads).toHaveLength(0)
  })

  it('handles empty stores gracefully', () => {
    expect(() => reconcileFromStore()).not.toThrow()
  })

  it('syncs shutdown servers', () => {
    mockStoreData['server-shutdown'] = {
      lastShutdownServers: [{ name: 'server1', status: 'running' }],
    }

    reconcileFromStore()

    const servers = testDb.prepare('SELECT * FROM shutdown_servers').all() as {
      server_data: string
    }[]
    expect(servers).toHaveLength(1)
    expect(JSON.parse(servers[0]!.server_data).name).toBe('server1')
  })
})
