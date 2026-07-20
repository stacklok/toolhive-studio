import type { WebContents } from 'electron'
import { Effect, Fiber } from 'effect'
import { ThreadsService } from '../threads/threads-service'
import { StreamConflictError } from '../runtime/errors'
import {
  buildActiveStream,
  cancelStream,
  getActiveStreamId,
  getStreamingChatIds,
  runManagedStreamPump,
  setToolUiMetadata,
  subscribeToStream,
  unsubscribeFromStream,
} from './stream-registry-engine'
import { flushPersist, makePersistMessages } from './stream-registry-persist'
import {
  _resetActiveStreamsForTests,
  configureStreamRegistry,
  purgeSender,
} from './stream-registry-state'
import type { RunStreamOptions } from './stream-registry-types'

export type { RunStreamOptions } from './stream-registry-types'
export { shutdownAllActiveStreams } from './stream-registry-persist'
export {
  purgeSender,
  _resetActiveStreamsForTests,
} from './stream-registry-state'

export class StreamRegistryService extends Effect.Service<StreamRegistryService>()(
  'chat/StreamRegistryService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const threads = yield* ThreadsService
      configureStreamRegistry(
        makePersistMessages(threads.updateThreadMessages.bind(threads))
      )

      return {
        runManagedStream: (options: RunStreamOptions) =>
          Effect.scoped(
            Effect.gen(function* () {
              const stream = yield* Effect.try({
                try: () => buildActiveStream(options),
                catch: (cause) =>
                  cause instanceof StreamConflictError
                    ? cause
                    : cause instanceof Error
                      ? cause
                      : new Error(String(cause)),
              })

              yield* Effect.addFinalizer(() =>
                Effect.sync(() => flushPersist(stream))
              )

              const fiber = yield* Effect.forkScoped(
                Effect.tryPromise({
                  try: () => runManagedStreamPump(options, stream),
                  catch: (cause) =>
                    cause instanceof Error ? cause : new Error(String(cause)),
                })
              )

              yield* Fiber.join(fiber)
            })
          ),
        subscribeToStream: (chatId: string, sender: WebContents) =>
          Effect.sync(() => subscribeToStream(chatId, sender)),
        unsubscribeFromStream: (chatId: string, sender: WebContents) =>
          Effect.sync(() => unsubscribeFromStream(chatId, sender)),
        cancelStream: (chatId: string) =>
          Effect.sync(() => cancelStream(chatId)),
        getActiveStreamId: (chatId: string) =>
          Effect.sync(() => getActiveStreamId(chatId)),
        getStreamingChatIds: () => Effect.sync(() => getStreamingChatIds()),
        setToolUiMetadata: (
          chatId: string,
          metadata: Record<string, unknown>
        ) => Effect.sync(() => setToolUiMetadata(chatId, metadata)),
        purgeSender: (sender: WebContents) =>
          Effect.sync(() => purgeSender(sender)),
        resetForTests: () => Effect.sync(() => _resetActiveStreamsForTests()),
      }
    }),
    dependencies: [ThreadsService.Default],
  }
) {}
