import { Effect, Layer } from 'effect'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const {
  fetchGatewayModelsMock,
  invalidateLlmConfigCacheMock,
  readLlmConfigMock,
  resolveGatewayBaseURLMock,
} = vi.hoisted(() => ({
  fetchGatewayModelsMock: vi.fn(),
  invalidateLlmConfigCacheMock: vi.fn(),
  readLlmConfigMock: vi.fn(),
  resolveGatewayBaseURLMock: vi.fn(),
}))

let lastKnownModels: string[] = []

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
    getName: vi.fn(() => 'ToolHive Studio'),
    on: vi.fn(),
    once: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  webContents: {
    getAllWebContents: vi.fn(() => []),
  },
}))

vi.mock('@sentry/electron/main', () => ({
  startSpanManual: vi.fn(),
  startSpan: vi.fn(),
  addBreadcrumb: vi.fn(),
  withScope: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

vi.mock('../../../logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../toolhive-manager', () => ({
  isToolhiveRunning: vi.fn(() => false),
  binPath: '/tmp/thv',
}))

vi.mock('../../../unix-socket-fetch', () => ({
  createMainProcessApiClient: vi.fn(),
  createMainProcessFetch: vi.fn(),
}))

vi.mock('../thv-llm', () => ({
  fetchGatewayModels: (...args: unknown[]) => fetchGatewayModelsMock(...args),
  getLastKnownGatewayModels: () => lastKnownModels,
  invalidateLlmConfigCache: (...args: unknown[]) =>
    invalidateLlmConfigCacheMock(...args),
  isLlmConfigured: (
    config: {
      gateway_url?: string
      oidc?: { issuer?: string; client_id?: string }
    } | null
  ) =>
    Boolean(
      config?.gateway_url?.trim() &&
      config?.oidc?.issuer?.trim() &&
      config?.oidc?.client_id?.trim()
    ),
  readLlmConfig: (...args: unknown[]) => readLlmConfigMock(...args),
  resolveGatewayBaseURL: (...args: unknown[]) =>
    resolveGatewayBaseURLMock(...args),
}))

import { SettingsService } from '../../settings/settings-service'
import { ProvidersService } from '../providers-service'

const configuredLlm = {
  gateway_url: 'https://gateway.example.com',
  oidc: { issuer: 'https://issuer.example.com', client_id: 'client' },
  proxy: { listen_port: 14000 },
}

function settingsLayer(playgroundEnabled: boolean) {
  return Layer.mock(SettingsService, {
    _tag: 'chat/SettingsService',
    getChatSettings: (providerId) => {
      if (providerId === 'thv-llm') {
        return Effect.succeed({
          providerId: 'thv-llm',
          endpointURL: playgroundEnabled ? 'enabled' : '',
          enabledTools: [] as string[],
        })
      }
      if (providerId === 'ollama' || providerId === 'lmstudio') {
        return Effect.succeed({
          providerId,
          endpointURL: '',
          enabledTools: [] as string[],
        })
      }
      return Effect.succeed({
        providerId,
        apiKey: '',
        enabledTools: [],
      })
    },
  })
}

function runWithSettings<A, E>(
  effect: Effect.Effect<A, E, ProvidersService>,
  playgroundEnabled = true
) {
  const layer = ProvidersService.DefaultWithoutDependencies.pipe(
    Layer.provide(settingsLayer(playgroundEnabled))
  )
  return Effect.runPromise(effect.pipe(Effect.provide(layer)))
}

describe('ProvidersService gateway models', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastKnownModels = []
    readLlmConfigMock.mockResolvedValue(configuredLlm)
    resolveGatewayBaseURLMock.mockResolvedValue('http://127.0.0.1:14000/v1')
    fetchGatewayModelsMock.mockResolvedValue({
      models: ['gpt-4.1'],
      authRequired: false,
    })
  })

  it('lists Stacklok Gateway models from the loopback URL', async () => {
    const result = await runWithSettings(
      ProvidersService.fetchProviderModels('thv-llm')
    )

    expect(invalidateLlmConfigCacheMock).toHaveBeenCalled()
    expect(resolveGatewayBaseURLMock).toHaveBeenCalled()
    expect(fetchGatewayModelsMock).toHaveBeenCalledWith(
      'http://127.0.0.1:14000/v1'
    )
    expect(result).toEqual({
      id: 'thv-llm',
      name: 'Stacklok Gateway',
      models: ['gpt-4.1'],
    })
  })

  it('prefers an explicit credential URL over resolved loopback', async () => {
    const result = await runWithSettings(
      ProvidersService.fetchProviderModels(
        'thv-llm',
        'http://127.0.0.1:15000/v1'
      )
    )

    expect(resolveGatewayBaseURLMock).not.toHaveBeenCalled()
    expect(fetchGatewayModelsMock).toHaveBeenCalledWith(
      'http://127.0.0.1:15000/v1'
    )
    expect(result?.models).toEqual(['gpt-4.1'])
  })

  it('falls back to cached models when listing requires sign-in', async () => {
    lastKnownModels = ['cached-model']
    fetchGatewayModelsMock.mockResolvedValue({
      models: [],
      authRequired: true,
    })

    const result = await runWithSettings(
      ProvidersService.fetchProviderModels('thv-llm')
    )

    expect(result?.models).toEqual(['cached-model'])
  })

  it('falls back to cached models when listing fails', async () => {
    lastKnownModels = ['cached-model']
    fetchGatewayModelsMock.mockResolvedValue({
      models: [],
      authRequired: false,
      error: 'Gateway model list failed: 503',
    })

    const result = await runWithSettings(
      ProvidersService.fetchProviderModels('thv-llm')
    )

    expect(result?.models).toEqual(['cached-model'])
  })

  it('uses cached models when no gateway base URL is available', async () => {
    lastKnownModels = ['cached-model']
    resolveGatewayBaseURLMock.mockResolvedValue(null)

    const result = await runWithSettings(
      ProvidersService.fetchProviderModels('thv-llm')
    )

    expect(fetchGatewayModelsMock).not.toHaveBeenCalled()
    expect(result?.models).toEqual(['cached-model'])
  })

  it('includes live gateway models in getAllProviders when Playground is enabled', async () => {
    const providers = await runWithSettings(ProvidersService.getAllProviders())
    const gateway = providers.find((provider) => provider.id === 'thv-llm')

    expect(fetchGatewayModelsMock).toHaveBeenCalledWith(
      'http://127.0.0.1:14000/v1'
    )
    expect(gateway?.models).toEqual(['gpt-4.1'])
  })

  it('does not fetch gateway models when Playground has not opted in', async () => {
    const providers = await runWithSettings(
      ProvidersService.getAllProviders(),
      false
    )
    const gateway = providers.find((provider) => provider.id === 'thv-llm')

    expect(fetchGatewayModelsMock).not.toHaveBeenCalled()
    expect(gateway?.models).toEqual([])
  })
})
