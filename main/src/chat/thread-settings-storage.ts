import log from '../logger'
import {
  readThreadSelectedModel,
  readThreadEnabledMcpTools,
  readThreadEnabledSkills,
} from '../db/readers/threads-reader'
import {
  writeThreadSelectedModel,
  writeThreadEnabledMcpTools,
  writeThreadEnabledSkills,
} from '../db/writers/threads-writer'
import { ensureThreadExists } from './thread-integration'

type Result = { success: boolean; error?: string }

function ensureRow(threadId: string): Result {
  const res = ensureThreadExists(threadId)
  if (!res.success) {
    return {
      success: false,
      error: res.error ?? 'Failed to materialise thread',
    }
  }
  return { success: true }
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
