import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import log from '../logger'

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

export type PricingMap = Record<string, Record<string, ModelCost>>

interface CacheFile {
  fetchedAt: number
  data: ModelsDevApi
}

let inMemory: { fetchedAt: number; pricing: PricingMap } | null = null
let inflightFetch: Promise<void> | null = null

function cachePath(): string {
  return path.join(app.getPath('userData'), CACHE_FILENAME)
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

async function readDiskCache(): Promise<CacheFile | null> {
  try {
    const raw = await fs.readFile(cachePath(), 'utf8')
    return JSON.parse(raw) as CacheFile
  } catch {
    return null
  }
}

async function writeDiskCache(cache: CacheFile): Promise<void> {
  try {
    await fs.writeFile(cachePath(), JSON.stringify(cache), 'utf8')
  } catch (err) {
    log.warn('[CHAT/PRICING] Failed to write cache:', err)
  }
}

async function fetchAndStore(): Promise<void> {
  try {
    const response = await fetch(MODELS_DEV_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      log.warn('[CHAT/PRICING] models.dev fetch failed:', response.status)
      return
    }
    const data = (await response.json()) as ModelsDevApi
    const fetchedAt = Date.now()
    inMemory = { fetchedAt, pricing: extractPricing(data) }
    await writeDiskCache({ fetchedAt, data })
  } catch (err) {
    log.warn('[CHAT/PRICING] models.dev fetch error:', err)
  }
}

async function ensureLoaded(): Promise<void> {
  if (inMemory && Date.now() - inMemory.fetchedAt < CACHE_TTL_MS) return

  if (!inMemory) {
    const disk = await readDiskCache()
    if (disk) {
      inMemory = {
        fetchedAt: disk.fetchedAt,
        pricing: extractPricing(disk.data),
      }
    }
  }

  if (!inMemory || Date.now() - inMemory.fetchedAt >= CACHE_TTL_MS) {
    if (!inflightFetch) {
      inflightFetch = fetchAndStore().finally(() => {
        inflightFetch = null
      })
    }
    if (inMemory) return
    await inflightFetch
  }
}

export async function getPricingMap(): Promise<PricingMap> {
  await ensureLoaded()
  return inMemory?.pricing ?? {}
}
