import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/electron/main'
import { initSentry } from '../sentry'

const { isTelemetryEnabled } = vi.hoisted(() => ({
  isTelemetryEnabled: { value: true },
}))

vi.mock('@sentry/electron/main', () => ({ init: vi.fn() }))

vi.mock('../telemetry-store', () => ({
  telemetryStore: {
    get: vi.fn(() => isTelemetryEnabled.value),
  },
}))

vi.mock('../util', () => ({
  getInstanceId: vi.fn(async () => 'instance-123'),
}))

vi.mock('../auto-launch', () => ({
  getAutoLaunchStatus: vi.fn(() => true),
}))

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

describe('initSentry (main)', () => {
  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear()
    isTelemetryEnabled.value = true
  })

  it('keeps the static trace lifecycle so beforeSendTransaction runs', () => {
    expect(getInitOptions().traceLifecycle).toBe('static')
  })

  it('restricts data collection to the SDK v10 defaults', () => {
    const { dataCollection } = getInitOptions()
    expect(dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
    })
  })

  it('drops transactions when telemetry is disabled', async () => {
    isTelemetryEnabled.value = false
    const { beforeSendTransaction } = getInitOptions()

    expect(await beforeSendTransaction?.(transaction, {})).toBeNull()
  })

  it('drops error events when telemetry is disabled', () => {
    isTelemetryEnabled.value = false
    const { beforeSend } = getInitOptions()

    expect(beforeSend?.({ type: undefined }, {})).toBeNull()
  })

  it('adds custom trace data when telemetry is enabled', async () => {
    const { beforeSendTransaction } = getInitOptions()

    const result = await beforeSendTransaction?.(transaction, {})

    expect(result?.contexts?.trace?.data).toMatchObject({
      'custom.user_id': 'instance-123',
      auto_launch_status: 'true',
    })
  })
})
