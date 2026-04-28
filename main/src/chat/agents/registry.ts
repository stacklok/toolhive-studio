import { nanoid } from 'nanoid'
import log from '../../logger'
import {
  readAgent,
  readAllAgents,
  readThreadAgentId,
} from '../../db/readers/agents-reader'
import {
  writeAgent,
  deleteAgentFromDb,
  writeThreadAgentId,
} from '../../db/writers/agents-writer'
import type { AgentConfig, CreateAgentInput, UpdateAgentInput } from './types'
import { DEFAULT_AGENT_ID, LEGACY_BUILTIN_AGENT_IDS } from './types'
import { getBuiltinAgentSeeds } from './builtin-prompts'

/**
 * Seed built-in agents into the database.
 *
 * - Inserts missing rows.
 * - For existing built-ins, refreshes the curated fields (name, description,
 *   instructions, builtinToolsKey) so prompt fixes ship with app updates.
 *   User-settable fields (defaultModel, createdAt) are preserved.
 *
 * To customise a built-in, users are expected to duplicate it into a custom
 * agent; editing built-ins directly is a no-op across upgrades.
 */
export function seedBuiltinAgents(): void {
  try {
    const now = Date.now()
    const existingById = new Map(readAllAgents().map((a) => [a.id, a]))
    for (const legacyId of LEGACY_BUILTIN_AGENT_IDS) {
      if (existingById.has(legacyId)) {
        deleteAgentFromDb(legacyId)
        existingById.delete(legacyId)
        log.info(`[AGENTS] Removed legacy built-in agent: ${legacyId}`)
      }
    }
    for (const seed of getBuiltinAgentSeeds(now)) {
      const existing = existingById.get(seed.id)
      if (!existing) {
        writeAgent(seed)
        log.info(`[AGENTS] Seeded built-in agent: ${seed.id}`)
        continue
      }

      const hasChanged =
        existing.name !== seed.name ||
        existing.description !== seed.description ||
        existing.instructions !== seed.instructions ||
        (existing.builtinToolsKey ?? null) !== (seed.builtinToolsKey ?? null)

      if (!hasChanged) continue

      const refreshed: AgentConfig = {
        ...seed,
        createdAt: existing.createdAt,
        updatedAt: now,
        ...(existing.defaultModel
          ? { defaultModel: existing.defaultModel }
          : {}),
      }
      writeAgent(refreshed)
      log.info(`[AGENTS] Refreshed built-in agent: ${seed.id}`)
    }
  } catch (err) {
    log.error('[AGENTS] Failed to seed built-in agents:', err)
  }
}

export function listAgents(): AgentConfig[] {
  return readAllAgents()
}

export function getAgent(id: string): AgentConfig | null {
  return readAgent(id)
}

/**
 * Resolve which agent should run for a given thread.
 * Falls back to the default built-in if the thread has no assignment or the
 * stored id no longer exists (e.g. custom agent deleted).
 */
export function resolveAgentForThread(
  threadId: string | undefined
): AgentConfig {
  if (threadId) {
    const assigned = readThreadAgentId(threadId)
    if (assigned) {
      const agent = readAgent(assigned)
      if (agent) return agent
    }
  }
  const fallback = readAgent(DEFAULT_AGENT_ID)
  if (fallback) return fallback

  // Extreme fallback: built-ins haven't been seeded yet. Seed and retry.
  seedBuiltinAgents()
  const retried = readAgent(DEFAULT_AGENT_ID)
  if (retried) return retried

  // Give up with a safe in-memory default so streaming can proceed.
  const now = Date.now()
  return {
    id: DEFAULT_AGENT_ID,
    kind: 'builtin',
    name: 'ToolHive Assistant',
    description: '',
    instructions: 'You are a helpful assistant.',
    builtinToolsKey: null,
    createdAt: now,
    updatedAt: now,
  }
}

function generateCustomId(): string {
  return `custom.${nanoid(12)}`
}

export function createCustomAgent(input: CreateAgentInput): AgentConfig {
  const now = Date.now()
  const agent: AgentConfig = {
    id: generateCustomId(),
    kind: 'custom',
    name: input.name.trim() || 'Untitled agent',
    description: input.description.trim(),
    instructions: input.instructions,
    ...(input.defaultModel ? { defaultModel: input.defaultModel } : {}),
    builtinToolsKey: input.builtinToolsKey ?? null,
    createdAt: now,
    updatedAt: now,
  }
  writeAgent(agent)
  return agent
}

export function updateAgent(
  id: string,
  input: UpdateAgentInput
): AgentConfig | null {
  const existing = readAgent(id)
  if (!existing) return null
  if (existing.kind === 'builtin') {
    throw new Error(
      'Built-in agents cannot be edited. Duplicate the agent to create a customisable copy.'
    )
  }

  // Explicitly clearing defaultModel: input.defaultModel === null
  let nextDefaultModel: AgentConfig['defaultModel'] = existing.defaultModel
  if (input.defaultModel === null) {
    nextDefaultModel = undefined
  } else if (input.defaultModel !== undefined) {
    nextDefaultModel = input.defaultModel
  }

  const nextBuiltinToolsKey =
    input.builtinToolsKey === undefined
      ? (existing.builtinToolsKey ?? null)
      : (input.builtinToolsKey ?? null)

  const next: AgentConfig = {
    ...existing,
    name: input.name?.trim() || existing.name,
    description:
      input.description !== undefined
        ? input.description.trim()
        : existing.description,
    instructions:
      input.instructions !== undefined
        ? input.instructions
        : existing.instructions,
    ...(nextDefaultModel ? { defaultModel: nextDefaultModel } : {}),
    builtinToolsKey: nextBuiltinToolsKey,
    updatedAt: Date.now(),
  }

  if (input.defaultModel === null) {
    delete next.defaultModel
  }

  writeAgent(next)
  return next
}

export function deleteAgent(id: string): {
  success: boolean
  error?: string
} {
  const existing = readAgent(id)
  if (!existing) return { success: false, error: 'Agent not found' }
  if (existing.kind === 'builtin') {
    return { success: false, error: 'Built-in agents cannot be deleted' }
  }
  deleteAgentFromDb(id)
  return { success: true }
}

export function duplicateAgent(id: string): AgentConfig | null {
  const source = readAgent(id)
  if (!source) return null
  const now = Date.now()
  const copy: AgentConfig = {
    id: generateCustomId(),
    kind: 'custom',
    name: `${source.name} (copy)`,
    description: source.description,
    instructions: source.instructions,
    ...(source.defaultModel ? { defaultModel: source.defaultModel } : {}),
    builtinToolsKey: source.builtinToolsKey ?? null,
    createdAt: now,
    updatedAt: now,
  }
  writeAgent(copy)
  return copy
}

export function setThreadAgent(threadId: string, agentId: string | null): void {
  writeThreadAgentId(threadId, agentId)
}

export function getThreadAgentId(threadId: string): string | null {
  return readThreadAgentId(threadId)
}
