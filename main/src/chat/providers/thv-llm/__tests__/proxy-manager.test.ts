import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { ChildProcess } from 'node:child_process'

const { gatewayFetchMock, readLlmConfigMock, spawnThvMock } = vi.hoisted(
  () => ({
    gatewayFetchMock: vi.fn(),
    readLlmConfigMock: vi.fn(),
    spawnThvMock: vi.fn(),
  })
)

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
  },
}))

vi.mock('../../../../logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../fetch', () => ({
  gatewayFetch: (...args: unknown[]) => gatewayFetchMock(...args),
  isAuthenticationRequiredResponse: (response: Response, bodyText?: string) => {
    if (response.status !== 401) return false
    if (!bodyText) return true
    try {
      const parsed = JSON.parse(bodyText) as { error?: string }
      return (
        parsed.error === 'authentication_required' ||
        /authentication/i.test(bodyText)
      )
    } catch {
      return /authentication/i.test(bodyText)
    }
  },
}))

vi.mock('../playground', () => ({
  isPlaygroundGatewayEnabled: vi.fn(() => true),
  migratePlaygroundGatewayEnablement: vi.fn(),
}))

vi.mock('../thv-cli', () => ({
  isLlmConfigured: (config: { gateway_url?: string } | null) =>
    Boolean(config?.gateway_url?.trim()),
  readLlmConfig: (...args: unknown[]) => readLlmConfigMock(...args),
  spawnThvProcess: (...args: unknown[]) => spawnThvMock(...args),
}))

import {
  ensureProxyStarted,
  fetchGatewayModels,
  getGatewayStatus,
  getLastKnownGatewayModels,
  resetThvLlmGatewayStateForTests,
  resolveGatewayBaseURL,
  startConfiguredLlmProxyIfNeeded,
  stopOwnedProxy,
  warmupGatewayAuth,
} from '../proxy-manager'

const configuredConfig = {
  gateway_url: 'https://gateway.example.com',
  oidc: { issuer: 'https://issuer.example.com', client_id: 'client' },
  proxy: { listen_port: 14000 },
}

const deps = {
  binPath: '/tmp/thv',
  spawnThv: spawnThvMock,
}

function mockReachableProxy(models = ['gpt-4.1']) {
  gatewayFetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith('/models')) {
      return new Response(
        JSON.stringify({ data: models.map((id) => ({ id })) }),
        {
          status: 200,
        }
      )
    }
    return new Response('', { status: 404 })
  })
}

function mockAuthRequiredProxy() {
  gatewayFetchMock.mockResolvedValue(
    new Response(JSON.stringify({ error: 'authentication_required' }), {
      status: 401,
    })
  )
}

describe('thv-llm proxy manager', () => {
  beforeEach(() => {
    resetThvLlmGatewayStateForTests()
    vi.clearAllMocks()
    readLlmConfigMock.mockResolvedValue(configuredConfig)
  })

  afterEach(() => {
    stopOwnedProxy()
    resetThvLlmGatewayStateForTests()
  })

  it('omits gateway from status when llm config is absent', async () => {
    readLlmConfigMock.mockResolvedValue(null)

    const status = await getGatewayStatus(deps)

    expect(status.configured).toBe(false)
    expect(status.authState).toBe('not_configured')
    expect(spawnThvMock).not.toHaveBeenCalled()
  })

  it('does not spawn when proxy is already reachable', async () => {
    mockReachableProxy()

    const result = await ensureProxyStarted(deps)

    expect(result.alreadyRunning).toBe(true)
    expect(result.started).toBe(false)
    expect(spawnThvMock).not.toHaveBeenCalled()
  })

  it('spawns proxy once when it is down', async () => {
    vi.useFakeTimers()

    const child = {
      pid: 1234,
      exitCode: null,
      signalCode: null,
      unref: vi.fn(),
      kill: vi.fn(),
    } as unknown as ChildProcess

    spawnThvMock.mockReturnValue(child)
    gatewayFetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    const resultPromise = ensureProxyStarted(deps)
    await vi.runAllTimersAsync()
    const result = await resultPromise

    vi.useRealTimers()

    expect(spawnThvMock).toHaveBeenCalledTimes(1)
    expect(spawnThvMock).toHaveBeenCalledWith(['llm', 'proxy', 'start'], {
      detached: true,
      stdio: 'ignore',
    })
    expect(result.started).toBe(true)
    expect(result.studioOwnsProxy).toBe(true)
    expect(result.error).toContain('did not become reachable')
  })

  it('stopOwnedProxy only stops processes started by Studio', async () => {
    vi.useFakeTimers()

    const child = {
      pid: 1234,
      exitCode: null,
      signalCode: null,
      unref: vi.fn(),
      kill: vi.fn(),
    } as unknown as ChildProcess
    spawnThvMock.mockReturnValue(child)
    gatewayFetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    const startPromise = ensureProxyStarted(deps)
    await vi.runAllTimersAsync()
    await startPromise

    vi.useRealTimers()

    stopOwnedProxy()

    expect(child.kill).toHaveBeenCalledWith('SIGTERM')

    stopOwnedProxy()
    expect(child.kill).toHaveBeenCalledTimes(1)
  })

  it('reports auth required for 401 model listing', async () => {
    mockAuthRequiredProxy()

    const result = await fetchGatewayModels('http://127.0.0.1:14000/v1')

    expect(result.authRequired).toBe(true)
    expect(result.models).toEqual([])
  })

  it('reports authenticating status when proxy needs sign-in', async () => {
    mockAuthRequiredProxy()

    const status = await getGatewayStatus(deps)

    expect(status.configured).toBe(true)
    expect(status.proxyRunning).toBe(true)
    expect(status.authState).toBe('authenticating')
  })

  it('starts the proxy immediately when llm config is present', async () => {
    vi.useFakeTimers()
    const child = {
      pid: 5555,
      exitCode: null,
      signalCode: null,
      unref: vi.fn(),
      kill: vi.fn(),
    } as unknown as ChildProcess
    spawnThvMock.mockReturnValue(child)
    gatewayFetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    const resultPromise = startConfiguredLlmProxyIfNeeded(deps)
    await vi.runAllTimersAsync()
    const result = await resultPromise
    vi.useRealTimers()

    expect(result).not.toBeNull()
    expect(spawnThvMock).toHaveBeenCalled()
  })

  it('does not start the proxy when Playground has not enabled the gateway', async () => {
    const { isPlaygroundGatewayEnabled } = await import('../playground')
    vi.mocked(isPlaygroundGatewayEnabled).mockReturnValue(false)

    const result = await startConfiguredLlmProxyIfNeeded(deps)

    expect(result).toBeNull()
    expect(spawnThvMock).not.toHaveBeenCalled()
  })

  it('does not start the proxy when llm config is absent', async () => {
    readLlmConfigMock.mockResolvedValue(null)

    const result = await startConfiguredLlmProxyIfNeeded(deps)

    expect(result).toBeNull()
    expect(spawnThvMock).not.toHaveBeenCalled()
  })

  it('coalesces concurrent ensureProxyStarted calls into a single spawn', async () => {
    vi.useFakeTimers()

    const child = {
      pid: 7777,
      exitCode: null,
      signalCode: null,
      unref: vi.fn(),
      kill: vi.fn(),
    } as unknown as ChildProcess
    spawnThvMock.mockReturnValue(child)
    gatewayFetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    const first = ensureProxyStarted(deps)
    const second = ensureProxyStarted(deps)
    await vi.runAllTimersAsync()
    const [a, b] = await Promise.all([first, second])
    vi.useRealTimers()

    expect(spawnThvMock).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
    expect(a.started).toBe(true)
  })

  it('resolves the loopback base URL from llm config', async () => {
    await expect(resolveGatewayBaseURL(deps)).resolves.toBe(
      'http://127.0.0.1:14000/v1'
    )
  })

  it('returns null when resolving a base URL without llm config', async () => {
    readLlmConfigMock.mockResolvedValue(null)
    await expect(resolveGatewayBaseURL(deps)).resolves.toBeNull()
  })

  it('lists gateway models and remembers them for later failures', async () => {
    mockReachableProxy(['gpt-4.1', 'claude-sonnet-5'])

    await expect(
      fetchGatewayModels('http://127.0.0.1:14000/v1')
    ).resolves.toEqual({
      models: ['gpt-4.1', 'claude-sonnet-5'],
      authRequired: false,
    })
    expect(getLastKnownGatewayModels()).toEqual(['gpt-4.1', 'claude-sonnet-5'])

    gatewayFetchMock.mockResolvedValue(
      new Response('unavailable', { status: 503 })
    )

    await expect(
      fetchGatewayModels('http://127.0.0.1:14000/v1')
    ).resolves.toMatchObject({
      models: ['gpt-4.1', 'claude-sonnet-5'],
      authRequired: false,
      error: expect.stringContaining('503'),
    })
  })

  it('returns a listing error when the models request throws', async () => {
    gatewayFetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(
      fetchGatewayModels('http://127.0.0.1:14000/v1')
    ).resolves.toEqual({
      models: [],
      authRequired: false,
      error: 'ECONNREFUSED',
    })
  })

  it('reports ready status when the proxy lists models', async () => {
    mockReachableProxy(['gpt-4.1'])

    const status = await getGatewayStatus(deps)

    expect(status).toMatchObject({
      configured: true,
      proxyRunning: true,
      authState: 'ready',
      listenPort: 14000,
      baseURL: 'http://127.0.0.1:14000/v1',
      gatewayURL: 'https://gateway.example.com',
      modelCount: 1,
      error: null,
    })
  })

  it('reports proxy_stopped when the loopback proxy is unreachable', async () => {
    gatewayFetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    const status = await getGatewayStatus(deps)

    expect(status.proxyRunning).toBe(false)
    expect(status.authState).toBe('proxy_stopped')
    expect(status.configured).toBe(true)
  })

  it('reports an error when the gateway returns no models', async () => {
    gatewayFetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    )

    const status = await getGatewayStatus(deps)

    expect(status.authState).toBe('error')
    expect(status.error).toBe('Gateway returned no models')
  })

  it('warms up as not_configured when llm config is missing', async () => {
    readLlmConfigMock.mockResolvedValue(null)

    await expect(warmupGatewayAuth(deps)).resolves.toEqual({
      ready: false,
      authState: 'not_configured',
      modelCount: 0,
      error: 'Stacklok Gateway is not configured',
    })
  })

  it('warms up as authenticating when model listing needs sign-in', async () => {
    mockAuthRequiredProxy()

    await expect(warmupGatewayAuth(deps)).resolves.toMatchObject({
      ready: false,
      authState: 'authenticating',
      modelCount: 0,
    })
  })

  it('warms up as ready when models are listed', async () => {
    mockReachableProxy(['gpt-4.1'])

    await expect(warmupGatewayAuth(deps)).resolves.toMatchObject({
      ready: true,
      authState: 'ready',
      modelCount: 1,
    })
  })

  it('warms up as error when proxy spawn fails', async () => {
    gatewayFetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
    spawnThvMock.mockImplementation(() => {
      throw new Error('spawn failed')
    })

    await expect(warmupGatewayAuth(deps)).resolves.toEqual({
      ready: false,
      authState: 'error',
      modelCount: 0,
      error: 'spawn failed',
    })
  })

  it('warms up as proxy_stopped when the spawned proxy never becomes reachable', async () => {
    vi.useFakeTimers()
    const child = {
      pid: 4242,
      exitCode: null,
      signalCode: null,
      unref: vi.fn(),
      kill: vi.fn(),
    } as unknown as ChildProcess
    spawnThvMock.mockReturnValue(child)
    gatewayFetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    const resultPromise = warmupGatewayAuth(deps)
    await vi.runAllTimersAsync()
    const result = await resultPromise
    vi.useRealTimers()

    expect(result).toMatchObject({
      ready: false,
      authState: 'proxy_stopped',
      modelCount: 0,
    })
  })
})
