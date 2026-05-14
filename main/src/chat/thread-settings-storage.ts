import log from '../logger'
import {
  readThread,
  readThreadSelectedModel,
  readThreadEnabledMcpTools,
  readThreadEnabledSkills,
} from '../db/readers/threads-reader'
import {
  writeThread,
  writeThreadSelectedModel,
  writeThreadEnabledMcpTools,
  writeThreadEnabledSkills,
} from '../db/writers/threads-writer'

type Result = { success: boolean; error?: string }

// Materialise a draft thread row before per-thread settings are written. Done
// directly via DB primitives (rather than `thread-integration`) so this module
// avoids a hard import on `threads-storage`, whose top-level `new ElectronStore`
// blows up in tests that don't mock electron.
function ensureRow(threadId: string): Result {
  try {
    const existing = readThread(threadId)
    if (existing) return { success: true }
    const now = Date.now()
    writeThread({
      id: threadId,
      messages: [],
      lastEditTimestamp: now,
      createdAt: now,
    })
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to ensure thread',
    }
  }
}

export function getThreadSelectedModel(
  threadId: string
): { provider: string; model: string } | null {
  try {
    return readThreadSelectedModel(threadId)
  } catch (err) {
    log.error('[THREAD-SETTINGS] Failed to read selected model:', err)
    return null
  }
}

export function setThreadSelectedModel(
  threadId: string,
  provider: string,
  model: string
): Result {
  try {
    const promoted = ensureRow(threadId)
    if (!promoted.success) return promoted
    writeThreadSelectedModel(threadId, provider || null, model || null)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function getThreadEnabledMcpTools(
  threadId: string
): Record<string, string[]> {
  try {
    return readThreadEnabledMcpTools(threadId)
  } catch (err) {
    log.error('[THREAD-SETTINGS] Failed to read enabled MCP tools:', err)
    return {}
  }
}

export function setThreadEnabledMcpTools(
  threadId: string,
  serverName: string,
  toolNames: string[]
): Result {
  try {
    const promoted = ensureRow(threadId)
    if (!promoted.success) return promoted
    const current = readThreadEnabledMcpTools(threadId)
    const next = { ...current, [serverName]: toolNames }
    writeThreadEnabledMcpTools(threadId, next)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export function getThreadEnabledSkills(threadId: string): string[] {
  try {
    return readThreadEnabledSkills(threadId)
  } catch (err) {
    log.error('[THREAD-SETTINGS] Failed to read enabled skills:', err)
    return []
  }
}

export function setThreadEnabledSkill(
  threadId: string,
  name: string,
  enabled: boolean
): Result {
  try {
    const trimmed = name.trim()
    if (!trimmed) {
      return { success: false, error: 'Skill name cannot be empty.' }
    }
    const promoted = ensureRow(threadId)
    if (!promoted.success) return promoted
    const current = readThreadEnabledSkills(threadId)
    const set = new Set(current)
    if (enabled) {
      set.add(trimmed)
    } else {
      set.delete(trimmed)
    }
    writeThreadEnabledSkills(threadId, Array.from(set).sort())
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
