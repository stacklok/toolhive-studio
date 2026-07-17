import { Effect, Fiber } from 'effect'
import type { WebContents } from 'electron'
import type { ChatRequest } from '../types'
import { AgentsService } from '../agents/agents-service'
import { McpService } from '../mcp/mcp-service'
import { StreamRegistryService } from './stream-registry-service'
import { handleChatStreamRealtime } from './chat-stream-service-impl'

export class ChatStreamService extends Effect.Service<ChatStreamService>()(
  'chat/ChatStreamService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
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
                })
              )

              yield* Effect.addFinalizer(() => Fiber.interrupt(fiber))
              return yield* Fiber.await(fiber)
            })
          ),
      }
    }),
    dependencies: [
      AgentsService.Default,
      McpService.Default,
      StreamRegistryService.Default,
    ],
  }
) {}
