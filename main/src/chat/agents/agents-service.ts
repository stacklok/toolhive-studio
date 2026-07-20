import { nanoid } from 'nanoid'
import { Effect } from 'effect'
import { readAgent, readAllAgents } from '../../db/readers/agents-reader'
import { writeAgent, deleteAgentFromDb } from '../../db/writers/agents-writer'
import type {
  AgentConfig,
  CreateAgentInput,
  UpdateAgentInput,
} from '@common/types/agents'
import {
  DEFAULT_AGENT_ID,
  LEGACY_BUILTIN_AGENT_IDS,
} from '@common/types/agents'
import { getBuiltinAgentSeeds } from '../agents/builtin-prompts'
import { createDefaultAgentConfig } from './default-agent'
import { StorageError, ValidationError } from '../runtime/errors'
import { chatLogError, chatLogInfo } from '../runtime/logging'
import { ThreadsRepository } from '../threads/threads-repository'

function wrapSync<A>(
  operation: string,
  fn: () => A
): Effect.Effect<A, StorageError> {
  return Effect.try({
    try: fn,
    catch: (cause) =>
      new StorageError({
        operation,
        cause,
        userMessage:
          cause instanceof Error ? cause.message : 'An agent operation failed.',
      }),
  })
}

export class AgentsService extends Effect.Service<AgentsService>()(
  'chat/AgentsService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const threadsRepo = yield* ThreadsRepository

      const generateCustomId = () => `custom.${nanoid(12)}`

      return {
        seedBuiltinAgents: () =>
          Effect.gen(function* () {
            const now = Date.now()
            const existingById = new Map(
              (yield* wrapSync('readAllAgents', readAllAgents)).map((a) => [
                a.id,
                a,
              ])
            )

            for (const legacyId of LEGACY_BUILTIN_AGENT_IDS) {
              if (existingById.has(legacyId)) {
                yield* wrapSync('deleteAgent', () =>
                  deleteAgentFromDb(legacyId)
                )
                existingById.delete(legacyId)
                yield* chatLogInfo(`Removed legacy built-in agent: ${legacyId}`)
              }
            }

            for (const seed of getBuiltinAgentSeeds(now)) {
              const existing = existingById.get(seed.id)
              if (!existing) {
                yield* wrapSync('writeAgent', () => writeAgent(seed))
                yield* chatLogInfo(`Seeded built-in agent: ${seed.id}`)
                continue
              }

              const hasChanged =
                existing.name !== seed.name ||
                existing.description !== seed.description ||
                existing.instructions !== seed.instructions ||
                (existing.builtinToolsKey ?? null) !==
                  (seed.builtinToolsKey ?? null)

              if (!hasChanged) continue

              const refreshed: AgentConfig = {
                ...seed,
                createdAt: existing.createdAt,
                updatedAt: now,
                ...(existing.defaultModel
                  ? { defaultModel: existing.defaultModel }
                  : {}),
              }
              yield* wrapSync('writeAgent', () => writeAgent(refreshed))
              yield* chatLogInfo(`Refreshed built-in agent: ${seed.id}`)
            }
          }).pipe(
            Effect.catchAll((error) =>
              chatLogError('Failed to seed built-in agents', error)
            )
          ),

        listAgents: () =>
          wrapSync('listAgents', readAllAgents).pipe(
            Effect.catchTag('StorageError', () => Effect.succeed([]))
          ),

        getAgent: (id: string) =>
          wrapSync('getAgent', () => readAgent(id)).pipe(
            Effect.catchTag('StorageError', () => Effect.succeed(null))
          ),

        resolveAgentForThread: (threadId: string | undefined) =>
          Effect.gen(function* () {
            if (threadId) {
              const assigned = yield* threadsRepo.readThreadAgentId(threadId)
              if (assigned) {
                const agent = yield* wrapSync('readAgent', () =>
                  readAgent(assigned)
                )
                if (agent) return agent
              }
            }

            const fallback = yield* wrapSync('readAgent', () =>
              readAgent(DEFAULT_AGENT_ID)
            )
            if (fallback) return fallback

            yield* wrapSync('reseedBuiltinAgents', () => {
              const now = Date.now()
              const existingById = new Map(
                readAllAgents().map((a) => [a.id, a])
              )
              for (const seed of getBuiltinAgentSeeds(now)) {
                if (!existingById.has(seed.id)) {
                  writeAgent(seed)
                }
              }
            })

            const retried = yield* wrapSync('readAgent', () =>
              readAgent(DEFAULT_AGENT_ID)
            )
            if (retried) return retried

            return createDefaultAgentConfig()
          }).pipe(
            Effect.catchTag('StorageError', () =>
              Effect.succeed(createDefaultAgentConfig())
            )
          ),

        createCustomAgent: (input: CreateAgentInput) =>
          wrapSync('createCustomAgent', () => {
            const now = Date.now()
            const agent: AgentConfig = {
              id: generateCustomId(),
              kind: 'custom',
              name: input.name.trim() || 'Untitled agent',
              description: input.description.trim(),
              instructions: input.instructions,
              ...(input.defaultModel
                ? { defaultModel: input.defaultModel }
                : {}),
              builtinToolsKey: input.builtinToolsKey ?? null,
              createdAt: now,
              updatedAt: now,
            }
            writeAgent(agent)
            return agent
          }),

        updateAgent: (id: string, input: UpdateAgentInput) =>
          Effect.gen(function* () {
            const existing = yield* wrapSync('readAgent', () => readAgent(id))
            if (!existing) return null
            if (existing.kind === 'builtin') {
              return yield* Effect.fail(
                new ValidationError({
                  field: 'id',
                  userMessage:
                    'Built-in agents cannot be edited. Duplicate the agent to create a customisable copy.',
                })
              )
            }

            let nextDefaultModel: AgentConfig['defaultModel'] =
              existing.defaultModel
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

            yield* wrapSync('writeAgent', () => writeAgent(next))
            return next
          }),

        deleteAgent: (id: string) =>
          Effect.gen(function* () {
            const existing = yield* wrapSync('readAgent', () => readAgent(id))
            if (!existing) {
              return { success: false as const, error: 'Agent not found' }
            }
            if (existing.kind === 'builtin') {
              return {
                success: false as const,
                error: 'Built-in agents cannot be deleted',
              }
            }
            yield* wrapSync('deleteAgent', () => deleteAgentFromDb(id))
            return { success: true as const }
          }),

        duplicateAgent: (id: string) =>
          Effect.gen(function* () {
            const source = yield* wrapSync('readAgent', () => readAgent(id))
            if (!source) return null
            const now = Date.now()
            const copy: AgentConfig = {
              id: generateCustomId(),
              kind: 'custom',
              name: `${source.name} (copy)`,
              description: source.description,
              instructions: source.instructions,
              ...(source.defaultModel
                ? { defaultModel: source.defaultModel }
                : {}),
              builtinToolsKey: source.builtinToolsKey ?? null,
              createdAt: now,
              updatedAt: now,
            }
            yield* wrapSync('writeAgent', () => writeAgent(copy))
            return copy
          }),

        setThreadAgent: (threadId: string, agentId: string | null) =>
          threadsRepo.writeThreadAgentId(threadId, agentId),

        getThreadAgentId: (threadId: string) =>
          threadsRepo
            .readThreadAgentId(threadId)
            .pipe(Effect.catchTag('StorageError', () => Effect.succeed(null))),
      }
    }),
    dependencies: [ThreadsRepository.Default],
  }
) {}
