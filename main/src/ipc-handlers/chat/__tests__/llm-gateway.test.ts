import { describe, it, expect, vi, beforeEach } from 'vitest'

const ctx = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  getGatewayStatus: vi.fn(),
  ensureProxyStarted: vi.fn(),
  warmupGatewayAuth: vi.fn(),
  invalidateLlmConfigCache: vi.fn(),
  readLlmConfig: vi.fn(),
  saveLlmConfig: vi.fn(),
  startConfiguredLlmProxyIfNeeded: vi.fn(),
  stopOwnedProxy: vi.fn(),
  toLlmGatewayConfigForm: vi.fn(),
  enablePlaygroundGateway: vi.fn(),
  clearPlaygroundGatewaySettings: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      ctx.handlers.set(channel, handler)
    },
  },
}))

vi.mock('../../../chat/providers/thv-llm', () => ({
  getGatewayStatus: (...args: unknown[]) => ctx.getGatewayStatus(...args),
  ensureProxyStarted: (...args: unknown[]) => ctx.ensureProxyStarted(...args),
  warmupGatewayAuth: (...args: unknown[]) => ctx.warmupGatewayAuth(...args),
  invalidateLlmConfigCache: (...args: unknown[]) =>
    ctx.invalidateLlmConfigCache(...args),
  readLlmConfig: (...args: unknown[]) => ctx.readLlmConfig(...args),
  saveLlmConfig: (...args: unknown[]) => ctx.saveLlmConfig(...args),
  startConfiguredLlmProxyIfNeeded: (...args: unknown[]) =>
    ctx.startConfiguredLlmProxyIfNeeded(...args),
  stopOwnedProxy: (...args: unknown[]) => ctx.stopOwnedProxy(...args),
  toLlmGatewayConfigForm: (...args: unknown[]) =>
    ctx.toLlmGatewayConfigForm(...args),
}))

vi.mock('../../../chat/providers/thv-llm/playground', () => ({
  enablePlaygroundGateway: (...args: unknown[]) =>
    ctx.enablePlaygroundGateway(...args),
  clearPlaygroundGatewaySettings: (...args: unknown[]) =>
    ctx.clearPlaygroundGatewaySettings(...args),
}))

import { register } from '../llm-gateway'

describe('chat/llm-gateway IPC handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ctx.handlers.clear()
    register()
  })

  it('returns gateway status', async () => {
    ctx.getGatewayStatus.mockResolvedValue({ configured: true })
    const result = await ctx.handlers.get('chat:llm-gateway:status')!(null)
    expect(result).toEqual({ configured: true })
  })

  it('starts the proxy', async () => {
    ctx.ensureProxyStarted.mockResolvedValue({ started: true })
    const result = await ctx.handlers.get('chat:llm-gateway:ensure-started')!(
      null
    )
    expect(result).toEqual({ started: true })
  })

  it('invalidates cache before warmup', async () => {
    ctx.warmupGatewayAuth.mockResolvedValue({ ready: true })
    const result = await ctx.handlers.get('chat:llm-gateway:warmup-auth')!(null)
    expect(ctx.invalidateLlmConfigCache).toHaveBeenCalled()
    expect(result).toEqual({ ready: true })
  })

  it('invalidates the cached llm config', async () => {
    await ctx.handlers.get('chat:llm-gateway:invalidate-config')!(null)
    expect(ctx.invalidateLlmConfigCache).toHaveBeenCalled()
  })

  it('maps stored config onto the settings form', async () => {
    ctx.readLlmConfig.mockResolvedValue({ gateway_url: 'https://gw' })
    ctx.toLlmGatewayConfigForm.mockReturnValue({
      gatewayUrl: 'https://gw',
      configured: true,
    })

    const result = await ctx.handlers.get('chat:llm-gateway:get-config')!(null)

    expect(ctx.invalidateLlmConfigCache).toHaveBeenCalled()
    expect(result).toEqual({ gatewayUrl: 'https://gw', configured: true })
  })

  it('enables Playground and starts the proxy after a successful save', async () => {
    ctx.saveLlmConfig.mockResolvedValue({ ok: true })
    const input = {
      gatewayUrl: 'https://gw',
      issuer: 'https://issuer',
      clientId: 'client',
    }

    const result = await ctx.handlers.get('chat:llm-gateway:save-config')!(
      null,
      input
    )

    expect(result).toEqual({ ok: true })
    expect(ctx.invalidateLlmConfigCache).toHaveBeenCalled()
    expect(ctx.enablePlaygroundGateway).toHaveBeenCalled()
    expect(ctx.startConfiguredLlmProxyIfNeeded).toHaveBeenCalled()
  })

  it('does not enable Playground when save fails', async () => {
    ctx.saveLlmConfig.mockResolvedValue({ ok: false, error: 'nope' })

    const result = await ctx.handlers.get('chat:llm-gateway:save-config')!(
      null,
      { gatewayUrl: '', issuer: '', clientId: '' }
    )

    expect(result).toEqual({ ok: false, error: 'nope' })
    expect(ctx.enablePlaygroundGateway).not.toHaveBeenCalled()
    expect(ctx.startConfiguredLlmProxyIfNeeded).not.toHaveBeenCalled()
  })

  it('clears Playground enablement and stops the owned proxy', async () => {
    const result = await ctx.handlers.get('chat:llm-gateway:disable')!(null)
    expect(result).toEqual({ ok: true })
    expect(ctx.clearPlaygroundGatewaySettings).toHaveBeenCalled()
    expect(ctx.stopOwnedProxy).toHaveBeenCalled()
    expect(ctx.invalidateLlmConfigCache).toHaveBeenCalled()
  })
})
