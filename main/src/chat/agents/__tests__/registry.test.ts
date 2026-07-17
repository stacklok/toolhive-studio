import '../../runtime/__tests__/setup'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installChatTestRuntimeHooks } from '../../runtime/test-runtime'
import type Database from 'better-sqlite3'
import { createTestDb } from '../../../db/__tests__/test-helpers'

let testDb: Database.Database

vi.mock('../../../db/database', () => ({
  getDb: () => testDb,
  isDbWritable: () => true,
  setDbWritable: vi.fn(),
}))

vi.mock('../../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => ':memory:'), getName: vi.fn(() => 'ToolHive') },
}))

import {
  seedBuiltinAgents,
  listAgents,
  getAgent,
  createCustomAgent,
  updateAgent,
  deleteAgent,
  duplicateAgent,
  setThreadAgent,
  getThreadAgentId,
  resolveAgentForThread,
} from '../registry'
import { BUILTIN_AGENT_IDS, DEFAULT_AGENT_ID } from '@common/types/agents'
import { writeThread } from '../../../db/writers/threads-writer'
import { writeAgent } from '../../../db/writers/agents-writer'

installChatTestRuntimeHooks()

beforeEach(() => {
  testDb = createTestDb()
})

afterEach(() => {
  testDb.close()
})

describe('agent registry — seedBuiltinAgents', () => {
  it('seeds the built-in agents on first run', () => {
    seedBuiltinAgents()
    const all = listAgents()
    const ids = all.map((a) => a.id).sort()
    expect(ids).toEqual(
      [BUILTIN_AGENT_IDS.toolhiveAssistant, BUILTIN_AGENT_IDS.skills].sort()
    )
    for (const agent of all) {
      expect(agent.kind).toBe('builtin')
      expect(agent.instructions.length).toBeGreaterThan(0)
    }
  })

  it('seeds the skills built-in with the matching tools key', () => {
    seedBuiltinAgents()
    const skills = getAgent(BUILTIN_AGENT_IDS.skills)
    expect(skills).not.toBeNull()
    expect(skills?.builtinToolsKey).toBe('skills')
    expect(skills?.kind).toBe('builtin')
  })

  it('removes legacy built-in agents (e.g. deprecated skill-tester) on seed', () => {
    const now = Date.now()
    // Simulate a user who upgraded from a version that seeded `builtin.skill-tester`.
    writeAgent({
      id: 'builtin.skill-tester',
      kind: 'builtin',
      name: 'Skill Tester',
      description: 'legacy',
      instructions: 'legacy',
      builtinToolsKey: null,
      createdAt: now,
      updatedAt: now,
    })
    expect(getAgent('builtin.skill-tester')).not.toBeNull()

    seedBuiltinAgents()

    expect(getAgent('builtin.skill-tester')).toBeNull()
  })

  it('refreshes curated built-in fields when the seed content changes', () => {
    // Pretend a previous app version seeded this built-in with a stale prompt.
    seedBuiltinAgents()
    const stored = getAgent(BUILTIN_AGENT_IDS.toolhiveAssistant)
    expect(stored).not.toBeNull()
    // Backdoor: simulate a stale prompt by writing directly via the lower-level writer.
    writeAgent({ ...stored!, instructions: 'LEGACY PROMPT' })
    expect(getAgent(BUILTIN_AGENT_IDS.toolhiveAssistant)?.instructions).toBe(
      'LEGACY PROMPT'
    )

    // Re-seeding should restore the curated instructions so prompt fixes
    // ship with app upgrades.
    seedBuiltinAgents()
    const refreshed = getAgent(BUILTIN_AGENT_IDS.toolhiveAssistant)
    expect(refreshed?.instructions).not.toBe('LEGACY PROMPT')
    expect(refreshed?.instructions?.length ?? 0).toBeGreaterThan(0)
  })

  it('refuses to edit built-in agents', () => {
    seedBuiltinAgents()
    expect(() =>
      updateAgent(BUILTIN_AGENT_IDS.toolhiveAssistant, {
        instructions: 'nope',
      })
    ).toThrow(/Built-in agents cannot be edited/)
  })

  it('is a no-op when curated fields are unchanged', () => {
    seedBuiltinAgents()
    const before = getAgent(BUILTIN_AGENT_IDS.toolhiveAssistant)
    seedBuiltinAgents()
    const after = getAgent(BUILTIN_AGENT_IDS.toolhiveAssistant)
    expect(after?.updatedAt).toBe(before?.updatedAt)
  })
})

describe('agent registry — CRUD', () => {
  beforeEach(() => {
    seedBuiltinAgents()
  })

  it('creates a custom agent with a generated id', () => {
    const created = createCustomAgent({
      name: 'My agent',
      description: 'A test agent',
      instructions: 'Be helpful.',
    })
    expect(created.kind).toBe('custom')
    expect(created.id.startsWith('custom.')).toBe(true)
    expect(getAgent(created.id)?.name).toBe('My agent')
  })

  it('updates an existing agent', () => {
    const created = createCustomAgent({
      name: 'Name',
      description: 'Desc',
      instructions: 'Inst',
    })
    const updated = updateAgent(created.id, {
      name: 'New name',
      instructions: 'New instructions',
    })
    expect(updated?.name).toBe('New name')
    expect(updated?.instructions).toBe('New instructions')
    expect(updated?.description).toBe('Desc')
  })

  it('clears defaultModel when explicitly set to null', () => {
    const created = createCustomAgent({
      name: 'Name',
      description: '',
      instructions: 'Inst',
      defaultModel: { provider: 'openai', model: 'gpt-4' },
    })
    expect(created.defaultModel).toEqual({
      provider: 'openai',
      model: 'gpt-4',
    })
    const updated = updateAgent(created.id, { defaultModel: null })
    expect(updated?.defaultModel).toBeUndefined()
    const read = getAgent(created.id)
    expect(read?.defaultModel).toBeUndefined()
  })

  it('prevents deleting built-in agents', () => {
    const result = deleteAgent(BUILTIN_AGENT_IDS.toolhiveAssistant)
    expect(result.success).toBe(false)
    expect(getAgent(BUILTIN_AGENT_IDS.toolhiveAssistant)).not.toBeNull()
  })

  it('allows deleting custom agents', () => {
    const created = createCustomAgent({
      name: 'Kill me',
      description: '',
      instructions: 'Inst',
    })
    const result = deleteAgent(created.id)
    expect(result.success).toBe(true)
    expect(getAgent(created.id)).toBeNull()
  })

  it('duplicates any agent as a custom copy', () => {
    const copy = duplicateAgent(BUILTIN_AGENT_IDS.toolhiveAssistant)
    expect(copy).not.toBeNull()
    expect(copy!.kind).toBe('custom')
    expect(copy!.id.startsWith('custom.')).toBe(true)
    expect(copy!.name.endsWith('(copy)')).toBe(true)
  })
})

describe('agent registry — thread resolution', () => {
  const baseThread = {
    id: 'thread-1',
    title: 'T',
    createdAt: 1,
    lastEditTimestamp: 1,
    messages: [],
  }

  beforeEach(() => {
    seedBuiltinAgents()
  })

  it('falls back to the default built-in when no thread agent is set', () => {
    const agent = resolveAgentForThread('does-not-exist')
    expect(agent.id).toBe(DEFAULT_AGENT_ID)
  })

  it('returns the agent assigned to the thread', () => {
    writeThread(baseThread)
    setThreadAgent(baseThread.id, BUILTIN_AGENT_IDS.skills)
    expect(getThreadAgentId(baseThread.id)).toBe(BUILTIN_AGENT_IDS.skills)
    const agent = resolveAgentForThread(baseThread.id)
    expect(agent.id).toBe(BUILTIN_AGENT_IDS.skills)
  })

  it('falls back to default when the assigned agent has been deleted', () => {
    writeThread(baseThread)
    const created = createCustomAgent({
      name: 'Custom',
      description: '',
      instructions: 'Inst',
    })
    setThreadAgent(baseThread.id, created.id)
    deleteAgent(created.id)
    const agent = resolveAgentForThread(baseThread.id)
    expect(agent.id).toBe(DEFAULT_AGENT_ID)
  })
})
