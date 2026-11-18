import { Context, Effect, Layer } from 'effect'
import type { ToolSet } from 'ai'
import { McpDiscoveryError, McpServerUnavailableError } from '../runtime/errors'
import { SettingsService } from '../settings/settings-service'
import { ThreadSettingsService } from '../settings/thread-settings-service'
import {
  createMcpTools as createMcpToolsImpl,
  fetchUiResource as fetchUiResourceImpl,
  bindMcpUiMetadataCache,
  getMcpServerTools as getMcpServerToolsImpl,
  proxyMcpToolCall as proxyMcpToolCallImpl,
} from './mcp-service-impl'
import { makeMcpUiMetadataCache } from './mcp-ui-metadata-cache'

const makeMcpService = Effect.gen(function* () {
  const settings = yield* SettingsService
  const threadSettings = yield* ThreadSettingsService
  const metadataCache = yield* makeMcpUiMetadataCache()
  bindMcpUiMetadataCache(metadataCache)

  return {
    getCachedUiMetadata: () => metadataCache.get(),

    fetchUiResource: (serverName: string, resourceUri: string) =>
      Effect.tryPromise({
        try: () => fetchUiResourceImpl(serverName, resourceUri),
        catch: (cause) =>
          new McpDiscoveryError({
            cause,
            userMessage: 'Failed to fetch MCP UI resource.',
            serverFailures: [],
          }),
      }),

    proxyMcpToolCall: (
      serverName: string,
      toolName: string,
      args: Record<string, unknown>
    ) =>
      Effect.tryPromise({
        try: () => proxyMcpToolCallImpl(serverName, toolName, args),
        catch: (cause) =>
          new McpDiscoveryError({
            cause,
            userMessage: 'Failed to proxy MCP tool call.',
            serverFailures: [{ serverName, reason: String(cause) }],
          }),
      }),

    getMcpServerTools: (serverName: string, threadId?: string) =>
      Effect.tryPromise({
        try: async () => {
          if (threadId) {
            const enabled = await Effect.runPromise(
              threadSettings.getThreadEnabledMcpTools(threadId)
            )
            return getMcpServerToolsWithEnabled(serverName, enabled, threadId)
          }
          const enabled = await Effect.runPromise(settings.getEnabledMcpTools())
          return getMcpServerToolsWithEnabled(serverName, enabled, threadId)
        },
        catch: (cause) =>
          new McpDiscoveryError({
            cause,
            userMessage:
              cause instanceof Error
                ? cause.message
                : 'Failed to load MCP server tools.',
            serverFailures: [{ serverName, reason: String(cause) }],
          }),
      }),

    createMcpTools: (
      threadId?: string,
      options?: { sanitizeSchemas?: boolean }
    ) =>
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: () =>
            createMcpToolsImpl(threadId, options, {
              getEnabledMcpTools: () =>
                Effect.runPromise(settings.getEnabledMcpTools()),
              getThreadEnabledMcpTools: (id) =>
                Effect.runPromise(threadSettings.getThreadEnabledMcpTools(id)),
            }),
          catch: (cause) =>
            new McpDiscoveryError({
              cause,
              userMessage: 'Failed to discover MCP tools.',
              serverFailures: [],
            }),
        })

        if (
          result.enabledServersWithWorkload > 0 &&
          Object.keys(result.tools as ToolSet).length === 0
        ) {
          return yield* Effect.fail(
            new McpServerUnavailableError({
              userMessage:
                'No MCP tools are available from the enabled servers.',
            })
          )
        }

        return result
      }),
  }
})

export class McpService extends Context.Service<
  McpService,
  Effect.Success<typeof makeMcpService>
>()('chat/McpService') {
  static readonly layer = Layer.effect(McpService, makeMcpService)
  static readonly Default = McpService.layer.pipe(
    Layer.provide(
      Layer.mergeAll(SettingsService.Default, ThreadSettingsService.Default)
    )
  )
}

async function getMcpServerToolsWithEnabled(
  serverName: string,
  enabledTools: Record<string, string[]>,
  threadId?: string
) {
  return getMcpServerToolsImpl(serverName, threadId, enabledTools)
}
