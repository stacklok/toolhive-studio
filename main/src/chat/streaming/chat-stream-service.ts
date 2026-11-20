import { Context, Effect, Fiber, Layer } from 'effect'
import type { WebContents } from 'electron'
import type { ChatRequest } from '../types'
import { AgentsService } from '../agents/agents-service'
import { McpService } from '../mcp/mcp-service'
import { StreamRegistryService } from './stream-registry-service'
import { handleChatStreamRealtime } from './chat-stream-service-impl'

const makeChatStreamService = Effect.gen(function* () {
  const agents = yield* AgentsService
  const mcp = yield* McpService
  const registry = yield* StreamRegistryService

  return {
    handleChatStreamRealtime: (
      request: ChatRequest,
      streamId: string,
      sender: WebContents
    ) =>
      Effect.scoped(
        Effect.gen(function* () {
          const fiber = yield* Effect.forkScoped(
            Effect.tryPromise({
              try: () =>
                handleChatStreamRealtime(
                  { agents, mcp, registry },
                  request,
                  streamId,
                  sender
                ),
              catch: (cause) =>
                cause instanceof Error ? cause : new Error(String(cause)),
            }),
            { startImmediately: true }
          )

          yield* Effect.addFinalizer(() => Fiber.interrupt(fiber))
          return yield* Fiber.join(fiber)
        })
      ),
  }
})

export class ChatStreamService extends Context.Service<
  ChatStreamService,
  Effect.Success<typeof makeChatStreamService>
>()('chat/ChatStreamService') {
  static readonly layer = Layer.effect(ChatStreamService, makeChatStreamService)
  static readonly Default = ChatStreamService.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        AgentsService.Default,
        McpService.Default,
        StreamRegistryService.Default
      )
    )
  )
}
