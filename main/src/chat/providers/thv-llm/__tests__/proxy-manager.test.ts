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
  resetThvLlmGatewayStateForTests,
  startConfiguredLlmProxyIfNeeded,
  stopOwnedProxy,
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
})
