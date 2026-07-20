import { Effect, Ref } from 'effect'
import { readAllMcpAppUiMetadata } from '../../db/readers/mcp-app-ui-metadata-reader'
import log from '../../logger'

export interface ToolUiMetadataEntry {
  resourceUri: string
  serverName: string
}

export interface McpUiMetadataCache {
  readonly get: () => Effect.Effect<Record<string, ToolUiMetadataEntry>>
  readonly commit: (
    next: Record<string, ToolUiMetadataEntry>
  ) => Effect.Effect<void>
  readonly resetForTests: () => Effect.Effect<void>
}

export function makeMcpUiMetadataCache(): Effect.Effect<McpUiMetadataCache> {
  return Effect.gen(function* () {
    const metadata = yield* Ref.make<Record<string, ToolUiMetadataEntry>>({})
    const loaded = yield* Ref.make(false)

    const ensureLoaded = Effect.gen(function* () {
      const isLoaded = yield* Ref.get(loaded)
      if (isLoaded) return

      yield* Effect.try({
        try: () => readAllMcpAppUiMetadata(),
        catch: (cause) => cause,
      }).pipe(
        Effect.tap((fromDb) => Ref.set(metadata, fromDb)),
        Effect.tap(() => Ref.set(loaded, true)),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            log.error('[MCP Apps] Failed to load UI metadata from DB:', error)
            // Mark loaded so a bad DB read doesn't retry (and re-log) on every
            // subsequent get() during streaming startup. Cache stays empty.
            yield* Ref.set(loaded, true)
          })
        )
      )
    })

    return {
      get: () =>
        Effect.gen(function* () {
          yield* ensureLoaded
          const current = yield* Ref.get(metadata)
          return { ...current }
        }),

      commit: (next) =>
        Effect.gen(function* () {
          yield* Ref.set(metadata, next)
          yield* Ref.set(loaded, true)
        }),

      resetForTests: () =>
        Effect.gen(function* () {
          yield* Ref.set(metadata, {})
          yield* Ref.set(loaded, false)
        }),
    }
  })
}
