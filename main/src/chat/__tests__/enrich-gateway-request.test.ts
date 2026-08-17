import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ChatRequest } from '../types'

const {
  ensureProxyStartedMock,
  resolveGatewayBaseURLMock,
  warmupGatewayAuthMock,
} = vi.hoisted(() => ({
  ensureProxyStartedMock: vi.fn(),
  resolveGatewayBaseURLMock: vi.fn(),
  warmupGatewayAuthMock: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
  },
}))

vi.mock('../providers/thv-llm', () => ({
  ensureProxyStarted: (...args: unknown[]) => ensureProxyStartedMock(...args),
  resolveGatewayBaseURL: (...args: unknown[]) =>
    resolveGatewayBaseURLMock(...args),
  warmupGatewayAuth: (...args: unknown[]) => warmupGatewayAuthMock(...args),
}))

import { enrichGatewayChatRequest } from '../enrich-gateway-request'

const LOOPBACK = 'http://127.0.0.1:14000/v1'

function gatewayRequest(
  endpointURL: string
): Extract<ChatRequest, { provider: 'thv-llm' }> {
  return {
    chatId: 'chat-1',
    messages: [],
    model: 'gpt-4.1',
    provider: 'thv-llm',
    endpointURL,
  }
}

describe('enrichGatewayChatRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureProxyStartedMock.mockResolvedValue({
      started: true,
      alreadyRunning: false,
      studioOwnsProxy: true,
    })
    resolveGatewayBaseURLMock.mockResolvedValue(LOOPBACK)
    warmupGatewayAuthMock.mockResolvedValue({
      ready: true,
      authState: 'ready',
      modelCount: 1,
    })
  })

  it('passes non-gateway requests through unchanged', async () => {
    const request: ChatRequest = {
      chatId: 'chat-1',
      messages: [],
      model: 'gpt-4o',
      provider: 'openai',
      apiKey: 'sk-test',
    }

    await expect(enrichGatewayChatRequest(request)).resolves.toBe(request)
    expect(ensureProxyStartedMock).not.toHaveBeenCalled()
  })

  it('resolves the Playground marker to the loopback proxy URL', async () => {
    const enriched = await enrichGatewayChatRequest(gatewayRequest('enabled'))

    expect(resolveGatewayBaseURLMock).toHaveBeenCalled()
    expect(enriched).toMatchObject({
      provider: 'thv-llm',
      endpointURL: LOOPBACK,
    })
  })

  it('keeps an explicit http endpoint URL', async () => {
    const stored = 'http://127.0.0.1:15000/v1'
    const enriched = await enrichGatewayChatRequest(gatewayRequest(stored))

    expect(resolveGatewayBaseURLMock).not.toHaveBeenCalled()
    expect(enriched).toMatchObject({ endpointURL: stored })
  })

  it('throws when the proxy fails to start', async () => {
    ensureProxyStartedMock.mockResolvedValue({
      started: false,
      alreadyRunning: false,
      studioOwnsProxy: false,
      error: 'Stacklok Gateway is not configured',
    })

    await expect(
      enrichGatewayChatRequest(gatewayRequest('enabled'))
    ).rejects.toThrow('Stacklok Gateway is not configured')
  })

  it('does not throw on start error when the proxy is already running', async () => {
    ensureProxyStartedMock.mockResolvedValue({
      started: false,
      alreadyRunning: true,
      studioOwnsProxy: false,
      error: 'LLM proxy did not become reachable in time',
    })

    await expect(
      enrichGatewayChatRequest(gatewayRequest('enabled'))
    ).resolves.toMatchObject({ endpointURL: LOOPBACK })
  })

  it('propagates warmup failures', async () => {
    warmupGatewayAuthMock.mockResolvedValue({
      ready: false,
      authState: 'authenticating',
      modelCount: 0,
      error: 'Complete sign-in in your browser',
    })

    await expect(
      enrichGatewayChatRequest(gatewayRequest('enabled'))
    ).rejects.toThrow('Complete sign-in in your browser')
  })
})
