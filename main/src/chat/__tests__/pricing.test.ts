import '../runtime/__tests__/setup'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installChatTestRuntimeHooks } from '../runtime/test-runtime'
import { promises as fs } from 'node:fs'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-userdata'),
  },
}))

vi.mock('../../logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { getPricingMap, _resetPricingStateForTests } from '../pricing'

installChatTestRuntimeHooks()

const SAMPLE_API = {
  openai: {
    models: {
      'gpt-4o': { cost: { input: 2.5, output: 10 } },
      'gpt-4o-mini': { cost: { input: 0.15, output: 0.6 } },
      // No cost — should be filtered out
      'something-free': {},
    },
  },
  ollama: {
    models: {
      // Providers with no priced models get pruned entirely
      'llama3:8b': {},
    },
  },
}

const EXPECTED_PRICING = {
  openai: {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
  },
}

function mockFetchOk(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockFetchFails() {
  const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('getPricingMap', () => {
  let readFileSpy: ReturnType<typeof vi.spyOn>
  let writeFileSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    _resetPricingStateForTests()
    readFileSpy = vi.spyOn(fs, 'readFile')
    writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    readFileSpy.mockRestore()
    writeFileSpy.mockRestore()
  })

  it('cold start with no disk cache fetches, returns pricing, and writes the cache', async () => {
    readFileSpy.mockRejectedValue(new Error('ENOENT'))
    const fetchMock = mockFetchOk(SAMPLE_API)

    const result = await getPricingMap()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(EXPECTED_PRICING)
    expect(writeFileSpy).toHaveBeenCalledTimes(1)
    const [cachePath, payload] = writeFileSpy.mock.calls[0]!
    expect(String(cachePath)).toContain('models-dev-cache.json')
    expect(JSON.parse(payload as string).data).toEqual(SAMPLE_API)
  })

  it('warm disk cache within TTL is used without a network fetch', async () => {
    const fresh = {
      fetchedAt: Date.now() - 60_000,
      data: SAMPLE_API,
    }
    readFileSpy.mockResolvedValue(JSON.stringify(fresh))
    const fetchMock = mockFetchOk(SAMPLE_API)

    const result = await getPricingMap()

    expect(result).toEqual(EXPECTED_PRICING)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(writeFileSpy).not.toHaveBeenCalled()
  })

  it('stale disk cache is returned immediately while a background refresh runs', async () => {
    const stale = {
      fetchedAt: Date.now() - 48 * 60 * 60 * 1000, // 48h old, beyond TTL
      data: SAMPLE_API,
    }
    readFileSpy.mockResolvedValue(JSON.stringify(stale))

    let resolveFetch!: (value: unknown) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })
    const fetchMock = vi.fn().mockReturnValue(fetchPromise)
    vi.stubGlobal('fetch', fetchMock)

    const result = await getPricingMap()

    // Returned the stale cache immediately
    expect(result).toEqual(EXPECTED_PRICING)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // Let the background fetch resolve so the test doesn't dangle
    resolveFetch({
      ok: true,
      status: 200,
      json: () => Promise.resolve(SAMPLE_API),
    })
  })

  it('offline with no disk cache returns an empty map and does not throw', async () => {
    readFileSpy.mockRejectedValue(new Error('ENOENT'))
    mockFetchFails()

    const result = await getPricingMap()

    expect(result).toEqual({})
    expect(writeFileSpy).not.toHaveBeenCalled()
  })

  it('does not write the disk cache when the upstream response is not ok', async () => {
    readFileSpy.mockRejectedValue(new Error('ENOENT'))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      })
    )

    const result = await getPricingMap()

    expect(result).toEqual({})
    expect(writeFileSpy).not.toHaveBeenCalled()
  })
})
