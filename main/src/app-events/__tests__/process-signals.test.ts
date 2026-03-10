import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('electron', () => ({
  app: { on: vi.fn(), isPackaged: false, getPath: vi.fn() },
  autoUpdater: { on: vi.fn(), setFeedURL: vi.fn() },
  dialog: { showMessageBox: vi.fn() },
  ipcMain: { handle: vi.fn() },
}))
vi.mock('@sentry/electron/main', () => ({ startSpan: vi.fn(), init: vi.fn() }))
vi.mock('electron-store', () => ({
  default: vi.fn(function Store() {
    return { get: vi.fn(), set: vi.fn() }
  }),
}))
vi.mock('../../app-state')
vi.mock('../../toolhive-manager')
vi.mock('../../graceful-exit')
vi.mock('../../system-tray')
vi.mock('../../logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { register } from '../process-signals'

describe('process-signals', () => {
  let processOnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process)
  })

  afterEach(() => {
    processOnSpy.mockRestore()
  })

  it('registers handlers for SIGTERM and SIGINT', () => {
    register()

    const registeredSignals = processOnSpy.mock.calls.map(
      ([sig]: [string]) => sig
    )
    expect(registeredSignals).toContain('SIGTERM')
    expect(registeredSignals).toContain('SIGINT')
  })
})
