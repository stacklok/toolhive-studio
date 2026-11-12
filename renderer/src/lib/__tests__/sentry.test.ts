import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/electron/renderer'
import { initSentry } from '../sentry'

vi.mock('@sentry/electron/renderer', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
}))

const isEnabled = vi.fn<() => Promise<boolean>>()

function getInitOptions() {
  initSentry()
  const options = vi.mocked(Sentry.init).mock.calls.at(-1)?.[0]
  if (!options) throw new Error('Sentry.init was not called')
  return options
}

type InitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>
type TransactionEvent = Parameters<
  NonNullable<InitOptions['beforeSendTransaction']>
>[0]

const transaction = {
  type: 'transaction',
  contexts: { trace: { trace_id: 'abc', span_id: 'def', data: {} } },
} as TransactionEvent

describe('initSentry (renderer)', () => {
  let originalSentry: unknown

  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear()
    isEnabled.mockResolvedValue(true)
    const api = window.electronAPI as unknown as Record<string, unknown>
    originalSentry = api.sentry
    api.sentry = { isEnabled }
  })

  afterEach(() => {
    const api = window.electronAPI as unknown as Record<string, unknown>
    api.sentry = originalSentry
  })

  it('keeps the static trace lifecycle so beforeSendTransaction runs', () => {
    expect(getInitOptions().traceLifecycle).toBe('static')
  })

  it('does not collect HTTP bodies or AI/MCP inputs and outputs', () => {
    expect(getInitOptions().dataCollection).toMatchObject({
      httpBodies: [],
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
    })
  })

  it('drops transactions when telemetry is disabled', async () => {
    isEnabled.mockResolvedValue(false)
    const { beforeSendTransaction } = getInitOptions()

    expect(await beforeSendTransaction?.(transaction, {})).toBeNull()
  })

  it('drops error events when telemetry is disabled', async () => {
    isEnabled.mockResolvedValue(false)
    const { beforeSend } = getInitOptions()

    expect(await beforeSend?.({ type: undefined }, {})).toBeNull()
  })

  it('adds the instance id to transactions when telemetry is enabled', async () => {
    const { beforeSendTransaction } = getInitOptions()

    const result = await beforeSendTransaction?.(transaction, {})

    expect(result?.contexts?.trace?.data).toMatchObject({
      'custom.user_id': 'test-instance-id',
    })
  })
})
