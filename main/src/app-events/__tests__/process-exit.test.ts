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
vi.mock('../../toolhive-manager')
vi.mock('../../logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { register } from '../process-exit'

describe('process-exit', () => {
  let processOnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process)
  })

  afterEach(() => {
    processOnSpy.mockRestore()
  })

  it('registers a handler for process exit', () => {
    register()

    const registeredEvents = processOnSpy.mock.calls.map(
      ([event]: [string]) => event
    )
    expect(registeredEvents).toContain('exit')
  })
})
