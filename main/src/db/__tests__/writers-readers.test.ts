import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { up as applyInitialSchema } from '../migrations/001-initial-schema'

let testDb: Database.Database

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

import { writeSetting, deleteSetting } from '../writers/settings-writer'
import { readSetting } from '../readers/settings-reader'
import {
  writeFeatureFlag,
  deleteFeatureFlag,
} from '../writers/feature-flags-writer'
import { readFeatureFlag } from '../readers/feature-flags-reader'
import {
  writeProvider,
  deleteProvider,
  clearAllProviders,
  writeSelectedModel,
  writeEnabledMcpTools,
  deleteEnabledMcpTools,
} from '../writers/chat-settings-writer'
import {
  readChatProvider,
  readAllProviders,
  readSelectedModel,
  readEnabledMcpTools,
} from '../readers/chat-settings-reader'
import {
  writeThread,
  deleteThreadFromDb,
  clearAllThreadsFromDb,
  writeActiveThread,
} from '../writers/threads-writer'
import {
  readThread,
  readAllThreads,
  readActiveThreadId,
  readThreadCount,
} from '../readers/threads-reader'
import {
  writeShutdownServers,
  clearShutdownServersFromDb,
} from '../writers/shutdown-writer'
import { readShutdownServers } from '../readers/shutdown-reader'

beforeEach(() => {
  testDb = new Database(':memory:')
  testDb.pragma('foreign_keys = ON')
  applyInitialSchema(testDb)
})

afterEach(() => {
  testDb.close()
})

describe('settings writer/reader', () => {
  it('writes and reads a setting', () => {
    writeSetting('foo', 'bar')
    expect(readSetting('foo')).toBe('bar')
  })

  it('overwrites an existing setting', () => {
    writeSetting('foo', 'bar')
    writeSetting('foo', 'baz')
    expect(readSetting('foo')).toBe('baz')
  })

  it('returns undefined for a missing setting', () => {
    expect(readSetting('nonexistent')).toBeUndefined()
  })

  it('deletes a setting', () => {
    writeSetting('foo', 'bar')
    deleteSetting('foo')
    expect(readSetting('foo')).toBeUndefined()
  })
})

describe('feature flags writer/reader', () => {
  it('writes and reads a feature flag', () => {
    writeFeatureFlag('test_flag', true)
    expect(readFeatureFlag('test_flag')).toBe(true)
  })

  it('writes a false flag', () => {
    writeFeatureFlag('test_flag', false)
    expect(readFeatureFlag('test_flag')).toBe(false)
  })

  it('returns undefined for a missing flag', () => {
    expect(readFeatureFlag('nonexistent')).toBeUndefined()
  })

  it('deletes a feature flag', () => {
    writeFeatureFlag('test_flag', true)
    deleteFeatureFlag('test_flag')
    expect(readFeatureFlag('test_flag')).toBeUndefined()
  })
})

describe('chat settings writer/reader', () => {
  it('writes and reads a provider with apiKey', () => {
    writeProvider('openai', { apiKey: 'sk-test' })
    const provider = readChatProvider('openai')
    expect(provider).not.toBeNull()
    expect(provider!.apiKey).toBe('sk-test')
  })

  it('writes and reads a provider with endpointURL', () => {
    writeProvider('ollama', { endpointURL: 'http://localhost:11434' })
    const provider = readChatProvider('ollama')
    expect(provider).not.toBeNull()
    expect(provider!.endpointURL).toBe('http://localhost:11434')
  })

  it('returns null for a missing provider', () => {
    expect(readChatProvider('nonexistent')).toBeNull()
  })

  it('reads all providers', () => {
    writeProvider('openai', { apiKey: 'sk-1' })
    writeProvider('ollama', { endpointURL: 'http://localhost' })
    const all = readAllProviders()
    expect(all.size).toBe(2)
    expect(all.has('openai')).toBe(true)
    expect(all.has('ollama')).toBe(true)
  })

  it('deletes a provider', () => {
    writeProvider('openai', { apiKey: 'sk-1' })
    deleteProvider('openai')
    expect(readChatProvider('openai')).toBeNull()
  })

  it('clears all providers', () => {
    writeProvider('openai', { apiKey: 'sk-1' })
    writeProvider('ollama', { endpointURL: 'url' })
    clearAllProviders()
    const all = readAllProviders()
    expect(all.size).toBe(0)
  })

  it('writes and reads selected model', () => {
    writeSelectedModel('openai', 'gpt-4')
    const model = readSelectedModel()
    expect(model.provider).toBe('openai')
    expect(model.model).toBe('gpt-4')
  })

  it('returns empty strings for unset selected model', () => {
    const model = readSelectedModel()
    expect(model.provider).toBe('')
    expect(model.model).toBe('')
  })

  it('writes and reads enabled MCP tools', () => {
    writeEnabledMcpTools('server1', ['tool1', 'tool2'])
    writeEnabledMcpTools('server2', ['tool3'])
    const tools = readEnabledMcpTools()
    expect(tools['server1']).toEqual(['tool1', 'tool2'])
    expect(tools['server2']).toEqual(['tool3'])
  })

  it('deletes enabled MCP tools', () => {
    writeEnabledMcpTools('server1', ['tool1'])
    deleteEnabledMcpTools('server1')
    const tools = readEnabledMcpTools()
    expect(tools['server1']).toBeUndefined()
  })
})

describe('threads writer/reader', () => {
  const sampleThread = {
    id: 'thread-1',
    title: 'Test Thread',
    createdAt: 1000,
    lastEditTimestamp: 2000,
    messages: [
      {
        id: 'msg-1',
        role: 'user' as const,
        parts: [{ type: 'text' as const, text: 'Hello' }],
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        parts: [{ type: 'text' as const, text: 'Hi there' }],
      },
    ],
  }

  it('writes and reads a thread with messages', () => {
    writeThread(sampleThread)
    const thread = readThread('thread-1')
    expect(thread).not.toBeNull()
    expect(thread!.id).toBe('thread-1')
    expect(thread!.title).toBe('Test Thread')
    expect(thread!.messages).toHaveLength(2)
    expect(thread!.messages[0]!.role).toBe('user')
  })

  it('returns null for a missing thread', () => {
    expect(readThread('nonexistent')).toBeNull()
  })

  it('reads all threads ordered by last_edit_timestamp DESC', () => {
    writeThread({ ...sampleThread, id: 'old', lastEditTimestamp: 1000 })
    writeThread({ ...sampleThread, id: 'new', lastEditTimestamp: 3000 })
    const threads = readAllThreads()
    expect(threads).toHaveLength(2)
    expect(threads[0]!.id).toBe('new')
    expect(threads[1]!.id).toBe('old')
  })

  it('deletes a thread and its messages', () => {
    writeThread(sampleThread)
    deleteThreadFromDb('thread-1')
    expect(readThread('thread-1')).toBeNull()
    expect(readThreadCount()).toBe(0)
  })

  it('clears all threads', () => {
    writeThread(sampleThread)
    writeThread({ ...sampleThread, id: 'thread-2' })
    clearAllThreadsFromDb()
    expect(readAllThreads()).toHaveLength(0)
  })

  it('writes and reads active thread', () => {
    writeThread(sampleThread)
    writeActiveThread('thread-1')
    expect(readActiveThreadId()).toBe('thread-1')
  })

  it('clears active thread', () => {
    writeThread(sampleThread)
    writeActiveThread('thread-1')
    writeActiveThread(undefined)
    expect(readActiveThreadId()).toBeUndefined()
  })

  it('counts threads', () => {
    expect(readThreadCount()).toBe(0)
    writeThread(sampleThread)
    expect(readThreadCount()).toBe(1)
  })

  it('updates thread by overwriting', () => {
    writeThread(sampleThread)
    const updated = {
      ...sampleThread,
      title: 'Updated Title',
      lastEditTimestamp: 5000,
    }
    writeThread(updated)
    const thread = readThread('thread-1')
    expect(thread!.title).toBe('Updated Title')
    expect(thread!.lastEditTimestamp).toBe(5000)
  })
})

describe('shutdown writer/reader', () => {
  it('writes and reads shutdown servers', () => {
    const servers = [
      { name: 'server1', status: 'running' },
      { name: 'server2', status: 'running' },
    ]
    writeShutdownServers(servers as never[])
    const result = readShutdownServers()
    expect(result).toHaveLength(2)
    expect(result[0]!.name).toBe('server1')
    expect(result[1]!.name).toBe('server2')
  })

  it('returns empty array when no servers are stored', () => {
    expect(readShutdownServers()).toHaveLength(0)
  })

  it('clears shutdown servers', () => {
    const servers = [{ name: 'server1', status: 'running' }]
    writeShutdownServers(servers as never[])
    clearShutdownServersFromDb()
    expect(readShutdownServers()).toHaveLength(0)
  })

  it('replaces all servers on write', () => {
    writeShutdownServers([{ name: 's1', status: 'running' }] as never[])
    writeShutdownServers([
      { name: 's2', status: 'running' },
      { name: 's3', status: 'stopped' },
    ] as never[])
    const result = readShutdownServers()
    expect(result).toHaveLength(2)
    expect(result[0]!.name).toBe('s2')
  })
})
