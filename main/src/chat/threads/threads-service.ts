import { Context, Effect, Layer } from 'effect'
import {
  ThreadAlreadyExistsError,
  ThreadNotFoundError,
} from '../runtime/errors'
import { ThreadsRepository } from './threads-repository'
import type {
  ChatSettingsThread,
  ListThreadsOptions,
  ThreadMessage,
  ThreadPage,
  ThreadUpdates,
} from './types'

function generateThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

const makeThreadsService = Effect.gen(function* () {
  const repo = yield* ThreadsRepository

  const getThreadOrFail = (threadId: string) =>
    Effect.gen(function* () {
      const thread = yield* repo.readThread(threadId)
      if (!thread) {
        return yield* Effect.fail(
          new ThreadNotFoundError({
            threadId,
            userMessage: 'Thread not found',
          })
        )
      }
      return thread
    })

  return {
    createThread: (
      title?: string,
      initialMessages: ThreadMessage[] = [],
      explicitId?: string
    ) =>
      Effect.gen(function* () {
        const threadId = explicitId ?? generateThreadId()
        if (explicitId) {
          const existing = yield* repo.readThread(explicitId)
          if (existing) {
            return yield* Effect.fail(
              new ThreadAlreadyExistsError({
                threadId: explicitId,
                userMessage: `Thread ${explicitId} already exists`,
              })
            )
          }
        }

        const now = Date.now()
        const newThread: ChatSettingsThread = {
          id: threadId,
          title,
          messages: initialMessages,
          lastEditTimestamp: now,
          createdAt: now,
        }

        yield* repo.writeThread(newThread)
        yield* repo.writeActiveThread(threadId)
        return { threadId }
      }),

    getThread: (threadId: string) =>
      repo
        .readThread(threadId)
        .pipe(Effect.catchTag('StorageError', () => Effect.succeed(null))),

    listThreads: (options?: ListThreadsOptions) =>
      repo
        .readThreadSummaries(options)
        .pipe(
          Effect.catchTag('StorageError', () =>
            Effect.succeed<ThreadPage>({ threads: [], nextCursor: null })
          )
        ),

    getThreadSummary: (threadId: string) =>
      repo
        .readThreadSummary(threadId)
        .pipe(Effect.catchTag('StorageError', () => Effect.succeed(null))),

    setThreadArchived: (threadId: string, archived: boolean) =>
      Effect.gen(function* () {
        const updated = yield* repo.writeThreadArchived(
          threadId,
          archived ? Date.now() : null
        )
        if (!updated) {
          return yield* Effect.fail(
            new ThreadNotFoundError({
              threadId,
              userMessage: 'Thread not found',
            })
          )
        }
        // Don't reopen an archived thread on the next launch.
        if (archived) {
          const activeThreadId = yield* repo.readActiveThreadId()
          if (activeThreadId === threadId) {
            yield* repo.writeActiveThread(undefined)
          }
        }
      }),

    updateThread: (threadId: string, updates: ThreadUpdates) =>
      Effect.gen(function* () {
        const existing = yield* getThreadOrFail(threadId)
        const updatedThread: ChatSettingsThread = {
          ...existing,
          ...updates,
          lastEditTimestamp: Date.now(),
        }
        yield* repo.writeThread(updatedThread)
      }),

    addMessageToThread: (threadId: string, message: ThreadMessage) =>
      Effect.gen(function* () {
        const existing = yield* getThreadOrFail(threadId)
        const updatedThread: ChatSettingsThread = {
          ...existing,
          messages: [...existing.messages, message],
          lastEditTimestamp: Date.now(),
        }
        yield* repo.writeThread(updatedThread)
      }),

    updateThreadMessages: (threadId: string, messages: ThreadMessage[]) =>
      repo.updateMessages(threadId, messages),

    deleteThread: (threadId: string) =>
      Effect.gen(function* () {
        yield* getThreadOrFail(threadId)
        yield* repo.deleteThread(threadId)
        const activeThreadId = yield* repo.readActiveThreadId()
        if (activeThreadId === threadId) {
          yield* repo.writeActiveThread(undefined)
        }
      }),

    getActiveThreadId: () =>
      repo
        .readActiveThreadId()
        .pipe(Effect.catchTag('StorageError', () => Effect.succeed(undefined))),

    setActiveThreadId: (threadId: string | undefined) =>
      Effect.gen(function* () {
        if (threadId) {
          yield* getThreadOrFail(threadId)
        }
        yield* repo.writeActiveThread(threadId)
      }),

    clearAllThreads: () => repo.clearAllThreads(),

    getThreadCount: () =>
      repo
        .readThreadCount()
        .pipe(Effect.catchTag('StorageError', () => Effect.succeed(0))),

    ensureThreadExists: (threadId?: string, title?: string) =>
      Effect.gen(function* () {
        if (threadId) {
          const existing = yield* repo.readThread(threadId)
          if (existing) {
            yield* repo.writeActiveThread(threadId)
            return { threadId, isNew: false as const }
          }
        }

        const id = threadId ?? generateThreadId()
        const now = Date.now()
        yield* repo.writeThread({
          id,
          title,
          messages: [],
          lastEditTimestamp: now,
          createdAt: now,
        })
        yield* repo.writeActiveThread(id)
        return { threadId: id, isNew: true as const }
      }),

    getThreadInfo: (threadId: string) =>
      Effect.gen(function* () {
        const thread = yield* repo.readThread(threadId)
        if (!thread) {
          return {
            thread: null,
            messageCount: 0,
            lastActivity: null,
            hasUserMessages: false,
            hasAssistantMessages: false,
          }
        }

        const messageCount = thread.messages.length
        const lastActivity = new Date(thread.lastEditTimestamp)
        const hasUserMessages = thread.messages.some(
          (msg) => msg.role === 'user'
        )
        const hasAssistantMessages = thread.messages.some(
          (msg) => msg.role === 'assistant'
        )

        return {
          thread,
          messageCount,
          lastActivity,
          hasUserMessages,
          hasAssistantMessages,
        }
      }).pipe(
        Effect.catchTag('StorageError', () =>
          Effect.succeed({
            thread: null,
            messageCount: 0,
            lastActivity: null,
            hasUserMessages: false,
            hasAssistantMessages: false,
          })
        )
      ),

    // Fail closed on StorageError — soft-failing to [] would hydrate the
    // renderer as an empty thread; the next send overwrites SQLite history.
    getThreadMessagesForTransport: (threadId: string) =>
      Effect.gen(function* () {
        const thread = yield* repo.readThread(threadId)
        if (!thread?.messages?.length) return []
        return thread.messages
      }),
  }
})

export class ThreadsService extends Context.Service<
  ThreadsService,
  Effect.Success<typeof makeThreadsService>
>()('chat/ThreadsService') {
  static readonly layer = Layer.effect(ThreadsService, makeThreadsService)
  static readonly Default = ThreadsService.layer.pipe(
    Layer.provide(ThreadsRepository.Default)
  )
}
