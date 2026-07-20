import { Effect } from 'effect'
import { ValidationError } from '../runtime/errors'
import { ThreadsRepository } from '../threads/threads-repository'

export class ThreadSettingsService extends Effect.Service<ThreadSettingsService>()(
  'chat/ThreadSettingsService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const repo = yield* ThreadsRepository

      const ensureRow = (threadId: string) => repo.ensureRow(threadId)

      return {
        getThreadSelectedModel: (threadId: string) =>
          repo
            .readThreadSelectedModel(threadId)
            .pipe(Effect.catchTag('StorageError', () => Effect.succeed(null))),

        setThreadSelectedModel: (
          threadId: string,
          provider: string,
          model: string
        ) =>
          Effect.gen(function* () {
            yield* ensureRow(threadId)
            yield* repo.writeThreadSelectedModel(
              threadId,
              provider || null,
              model || null
            )
          }),

        getThreadEnabledMcpTools: (threadId: string) =>
          repo
            .readThreadEnabledMcpTools(threadId)
            .pipe(Effect.catchTag('StorageError', () => Effect.succeed({}))),

        setThreadEnabledMcpTools: (
          threadId: string,
          serverName: string,
          toolNames: string[]
        ) =>
          Effect.gen(function* () {
            yield* ensureRow(threadId)
            const current = yield* repo.readThreadEnabledMcpTools(threadId)
            const next = { ...current, [serverName]: toolNames }
            yield* repo.writeThreadEnabledMcpTools(threadId, next)
          }),

        getThreadEnabledSkills: (threadId: string) =>
          repo
            .readThreadEnabledSkills(threadId)
            .pipe(Effect.catchTag('StorageError', () => Effect.succeed([]))),

        setThreadEnabledSkill: (
          threadId: string,
          name: string,
          enabled: boolean
        ) =>
          Effect.gen(function* () {
            const trimmed = name.trim()
            if (!trimmed) {
              return yield* Effect.fail(
                new ValidationError({
                  field: 'name',
                  userMessage: 'Skill name cannot be empty.',
                })
              )
            }
            yield* ensureRow(threadId)
            const current = yield* repo.readThreadEnabledSkills(threadId)
            const set = new Set(current)
            if (enabled) {
              set.add(trimmed)
            } else {
              set.delete(trimmed)
            }
            yield* repo.writeThreadEnabledSkills(
              threadId,
              Array.from(set).sort()
            )
          }),
      }
    }),
    dependencies: [ThreadsRepository.Default],
  }
) {}
