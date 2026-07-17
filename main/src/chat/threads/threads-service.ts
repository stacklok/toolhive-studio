import { Effect } from 'effect'
import {
  ThreadAlreadyExistsError,
  ThreadNotFoundError,
} from '../runtime/errors'
import { ThreadsRepository } from './threads-repository'
import type { ChatSettingsThread, ThreadMessage, ThreadUpdates } from './types'

function generateThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export class ThreadsService extends Effect.Service<ThreadsService>()(
  'chat/ThreadsService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
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

        getAllThreads: () =>
          repo
            .readAllThreads()
            .pipe(Effect.catchTag('StorageError', () => Effect.succeed([]))),

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
          repo.updateMessages(threadId, messages).pipe(
            Effect.mapError((error) =>
              error.userMessage === 'Thread not found'
                ? new ThreadNotFoundError({
                    threadId,
                    userMessage: 'Thread not found',
                  })
                : error
            )
          ),

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
            .pipe(
              Effect.catchTag('StorageError', () => Effect.succeed(undefined))
            ),

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

            const created = yield* Effect.gen(function* () {
              const id = threadId ?? generateThreadId()
              if (threadId) {
                const existing = yield* repo.readThread(threadId)
                if (existing) {
                  return yield* Effect.fail(
                    new ThreadAlreadyExistsError({
                      threadId,
                      userMessage: `Thread ${threadId} already exists`,
                    })
                  )
                }
              }
              const now = Date.now()
              yield* repo.writeThread({
                id,
                title,
                messages: [],
                lastEditTimestamp: now,
                createdAt: now,
              })
              yield* repo.writeActiveThread(id)
              return { threadId: id }
            })

            return { threadId: created.threadId, isNew: true as const }
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

        getThreadMessagesForTransport: (threadId: string) =>
          Effect.gen(function* () {
            const thread = yield* repo.readThread(threadId)
            if (!thread?.messages?.length) return []
            return thread.messages
          }).pipe(Effect.catchTag('StorageError', () => Effect.succeed([]))),
      }
    }),
    dependencies: [ThreadsRepository.Default],
  }
) {}
