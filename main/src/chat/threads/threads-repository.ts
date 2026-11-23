import { Context, Effect, Layer } from 'effect'
import {
  writeThread,
  deleteThreadFromDb,
  clearAllThreadsFromDb,
  writeActiveThread,
  writeThreadSelectedModel,
  writeThreadEnabledMcpTools,
  writeThreadEnabledSkills,
  writeThreadArchived,
} from '../../db/writers/threads-writer'
import { writeThreadAgentId } from '../../db/writers/agents-writer'
import {
  readThread,
  readThreadSummaries,
  readThreadSummary,
  searchThreads,
  readActiveThreadId,
  readThreadCount,
  readThreadSelectedModel,
  readThreadEnabledMcpTools,
  readThreadEnabledSkills,
} from '../../db/readers/threads-reader'
import { readThreadAgentId } from '../../db/readers/agents-reader'
import { StorageError, ThreadNotFoundError } from '../runtime/errors'
import type {
  ChatSettingsThread,
  ListThreadsOptions,
  ThreadMessage,
} from './types'

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
          cause instanceof Error
            ? cause.message
            : 'A storage operation failed.',
      }),
  })
}

const makeThreadsRepository = Effect.sync(() => ({
  readThread: (threadId: string) =>
    wrapSync('readThread', () => readThread(threadId)),

  readThreadSummaries: (options?: ListThreadsOptions) =>
    wrapSync('readThreadSummaries', () => readThreadSummaries(options)),

  searchThreads: (query: string) =>
    wrapSync('searchThreads', () => searchThreads(query)),

  readThreadSummary: (threadId: string) =>
    wrapSync('readThreadSummary', () => readThreadSummary(threadId)),

  writeThreadArchived: (threadId: string, archivedAt: number | null) =>
    wrapSync('writeThreadArchived', () =>
      writeThreadArchived(threadId, archivedAt)
    ),

  readActiveThreadId: () =>
    wrapSync('readActiveThreadId', () => readActiveThreadId() ?? undefined),

  readThreadCount: () => wrapSync('readThreadCount', () => readThreadCount()),

  writeThread: (thread: ChatSettingsThread) =>
    wrapSync('writeThread', () => {
      writeThread(thread)
    }),

  deleteThread: (threadId: string) =>
    wrapSync('deleteThread', () => {
      deleteThreadFromDb(threadId)
    }),

  clearAllThreads: () =>
    wrapSync('clearAllThreads', () => {
      clearAllThreadsFromDb()
    }),

  writeActiveThread: (threadId: string | undefined) =>
    wrapSync('writeActiveThread', () => {
      writeActiveThread(threadId)
    }),

  readThreadSelectedModel: (threadId: string) =>
    wrapSync('readThreadSelectedModel', () =>
      readThreadSelectedModel(threadId)
    ),

  writeThreadSelectedModel: (
    threadId: string,
    provider: string | null,
    model: string | null
  ) =>
    wrapSync('writeThreadSelectedModel', () => {
      writeThreadSelectedModel(threadId, provider, model)
    }),

  readThreadEnabledMcpTools: (threadId: string) =>
    wrapSync('readThreadEnabledMcpTools', () =>
      readThreadEnabledMcpTools(threadId)
    ),

  writeThreadEnabledMcpTools: (
    threadId: string,
    tools: Record<string, string[]>
  ) =>
    wrapSync('writeThreadEnabledMcpTools', () => {
      writeThreadEnabledMcpTools(threadId, tools)
    }),

  readThreadEnabledSkills: (threadId: string) =>
    wrapSync('readThreadEnabledSkills', () =>
      readThreadEnabledSkills(threadId)
    ),

  writeThreadEnabledSkills: (threadId: string, skills: string[]) =>
    wrapSync('writeThreadEnabledSkills', () => {
      writeThreadEnabledSkills(threadId, skills)
    }),

  readThreadAgentId: (threadId: string) =>
    wrapSync('readThreadAgentId', () => readThreadAgentId(threadId)),

  writeThreadAgentId: (threadId: string, agentId: string | null) =>
    wrapSync('writeThreadAgentId', () => {
      writeThreadAgentId(threadId, agentId)
    }),

  ensureRow: (threadId: string) =>
    Effect.gen(function* () {
      const existing = yield* wrapSync('readThread', () => readThread(threadId))
      if (existing) return
      const now = Date.now()
      yield* wrapSync('writeThread', () => {
        writeThread({
          id: threadId,
          messages: [],
          lastEditTimestamp: now,
          createdAt: now,
        })
      })
    }),

  updateMessages: (threadId: string, messages: ThreadMessage[]) =>
    Effect.gen(function* () {
      const existing = yield* wrapSync('readThread', () => readThread(threadId))
      if (!existing) {
        return yield* Effect.fail(
          new ThreadNotFoundError({
            threadId,
            userMessage: 'Thread not found',
          })
        )
      }
      const updated: ChatSettingsThread = {
        ...existing,
        messages,
        lastEditTimestamp: Date.now(),
      }
      yield* wrapSync('writeThread', () => {
        writeThread(updated)
      })
    }),
}))

export class ThreadsRepository extends Context.Service<
  ThreadsRepository,
  Effect.Success<typeof makeThreadsRepository>
>()('chat/ThreadsRepository') {
  static readonly layer = Layer.effect(ThreadsRepository, makeThreadsRepository)
  static readonly Default = ThreadsRepository.layer
}
