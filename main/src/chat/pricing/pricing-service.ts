import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Effect, Ref } from 'effect'
import { StorageError } from '../runtime/errors'
import { chatLogWarning } from '../runtime/logging'

const MODELS_DEV_URL = 'https://models.dev/api.json'
const CACHE_FILENAME = 'models-dev-cache.json'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 10_000

interface ModelCost {
  input: number
  output: number
  cache_read?: number
  cache_write?: number
}

interface ModelEntry {
  cost?: ModelCost
}

interface ProviderEntry {
  models?: Record<string, ModelEntry>
}

type ModelsDevApi = Record<string, ProviderEntry>
type PricingMap = Record<string, Record<string, ModelCost>>

interface CacheFile {
  fetchedAt: number
  data: ModelsDevApi
}

interface PricingState {
  readonly fetchedAt: number
  readonly pricing: PricingMap
}

function extractPricing(api: ModelsDevApi): PricingMap {
  const result: PricingMap = {}
  for (const [providerId, provider] of Object.entries(api)) {
    if (!provider?.models) continue
    const models: Record<string, ModelCost> = {}
    for (const [modelId, model] of Object.entries(provider.models)) {
      if (model?.cost) {
        models[modelId] = model.cost
      }
    }
    if (Object.keys(models).length > 0) {
      result[providerId] = models
    }
  }
  return result
}

function cachePath(): string {
  return path.join(app.getPath('userData'), CACHE_FILENAME)
}

export class PricingService extends Effect.Service<PricingService>()(
  'chat/PricingService',
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const state = yield* Ref.make<PricingState | null>(null)
      const inflight = yield* Ref.make(false)

      const readDiskCache = (): Effect.Effect<CacheFile | null> =>
        Effect.promise(async () => {
          try {
            const raw = await fs.readFile(cachePath(), 'utf8')
            return JSON.parse(raw) as CacheFile
          } catch {
            return null
          }
        })

      const writeDiskCache = (cache: CacheFile) =>
        Effect.tryPromise({
          try: async () => {
            await fs.writeFile(cachePath(), JSON.stringify(cache), 'utf8')
          },
          catch: (cause) =>
            new StorageError({
              operation: 'writeDiskCache',
              cause,
              userMessage: 'Failed to write pricing cache.',
            }),
        }).pipe(
          Effect.catchAll((error) =>
            chatLogWarning(
              `Failed to write pricing cache: ${error.userMessage}`
            )
          )
        )

      const fetchAndStore = () =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(MODELS_DEV_URL, {
              signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            })
            if (!response.ok) {
              throw new Error(`models.dev fetch failed: ${response.status}`)
            }
            const data = (await response.json()) as ModelsDevApi
            const fetchedAt = Date.now()
            const pricing = extractPricing(data)
            return { fetchedAt, pricing, data }
          },
          catch: (cause) =>
            new StorageError({
              operation: 'fetchAndStore',
              cause,
              userMessage: 'Failed to fetch model pricing.',
            }),
        }).pipe(
          // Single attempt: cold getPricingMap() awaits this path and a 3×
          // retry with 10s timeouts could block ~30s on an unreachable host.
          Effect.tap(({ fetchedAt, pricing, data }) =>
            Effect.gen(function* () {
              yield* Ref.set(state, { fetchedAt, pricing })
              yield* writeDiskCache({ fetchedAt, data })
            })
          ),
          Effect.catchAll((error) =>
            chatLogWarning(`models.dev fetch error: ${error.userMessage}`)
          ),
          Effect.asVoid
        )

      const ensureLoaded = () =>
        Effect.gen(function* () {
          const current = yield* Ref.get(state)
          if (current && Date.now() - current.fetchedAt < CACHE_TTL_MS) {
            return
          }

          if (!current) {
            const disk = yield* readDiskCache()
            if (disk) {
              yield* Ref.set(state, {
                fetchedAt: disk.fetchedAt,
                pricing: extractPricing(disk.data),
              })
            }
          }

          const refreshed = yield* Ref.get(state)
          if (refreshed && Date.now() - refreshed.fetchedAt < CACHE_TTL_MS) {
            return
          }

          const alreadyInflight = yield* Ref.get(inflight)
          if (alreadyInflight) {
            return
          }

          yield* Ref.set(inflight, true)
          const refresh = fetchAndStore().pipe(
            Effect.ensuring(Ref.set(inflight, false))
          )

          if (refreshed) {
            yield* Effect.forkDaemon(refresh)
            return
          }

          yield* refresh
        })

      return {
        getPricingMap: () =>
          Effect.gen(function* () {
            yield* ensureLoaded()
            const current = yield* Ref.get(state)
            return current?.pricing ?? {}
          }),

        resetForTests: () =>
          Effect.gen(function* () {
            yield* Ref.set(state, null)
            yield* Ref.set(inflight, false)
          }),
      }
    }),
  }
) {}
