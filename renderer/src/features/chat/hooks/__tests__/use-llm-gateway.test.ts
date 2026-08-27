import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ensureGatewayReady } from '../use-llm-gateway'

const mockLlmGateway = {
  ensureStarted: vi.fn(),
  warmupAuth: vi.fn(),
}

describe('ensureGatewayReady', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.electronAPI.chat = {
      ...window.electronAPI.chat,
      llmGateway: mockLlmGateway,
    } as unknown as typeof window.electronAPI.chat
  })

  it('returns ready when warmup succeeds', async () => {
    mockLlmGateway.ensureStarted.mockResolvedValue({ started: true })
    mockLlmGateway.warmupAuth.mockResolvedValue({ ready: true, modelCount: 1 })

    await expect(ensureGatewayReady()).resolves.toEqual({ ready: true })
  })

  it('returns warmup error without throwing', async () => {
    mockLlmGateway.ensureStarted.mockResolvedValue({ started: true })
    mockLlmGateway.warmupAuth.mockResolvedValue({
      ready: false,
      error: 'Complete sign-in in your browser',
    })

    await expect(ensureGatewayReady()).resolves.toEqual({
      ready: false,
      error: 'Complete sign-in in your browser',
    })
  })

  it('surfaces IPC rejections as a not-ready error', async () => {
    mockLlmGateway.ensureStarted.mockRejectedValue(new Error('proxy timeout'))

    await expect(ensureGatewayReady()).resolves.toEqual({
      ready: false,
      error: 'proxy timeout',
    })
  })

  it('uses a default message when warmup fails without one', async () => {
    mockLlmGateway.ensureStarted.mockResolvedValue({ started: true })
    mockLlmGateway.warmupAuth.mockResolvedValue({ ready: false })

    await expect(ensureGatewayReady()).resolves.toEqual({
      ready: false,
      error: 'Complete sign-in in your browser to use Stacklok Gateway.',
    })
  })

  it('uses a default message when IPC throws a non-Error', async () => {
    mockLlmGateway.ensureStarted.mockRejectedValue('unavailable')

    await expect(ensureGatewayReady()).resolves.toEqual({
      ready: false,
      error: 'Failed to connect to Stacklok Gateway.',
    })
  })
})
