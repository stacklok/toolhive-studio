import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appOn: vi.fn(),
}))

vi.mock('electron', () => ({
  app: { on: mocks.appOn, isPackaged: false, getPath: vi.fn() },
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
vi.mock('../../quit-confirmation')
vi.mock('../block-quit')
vi.mock('../../logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { register } from '../before-quit'

describe('before-quit', () => {
  it('registers a before-quit handler on app', () => {
    register()
    expect(mocks.appOn).toHaveBeenCalledWith(
      'before-quit',
      expect.any(Function)
    )
  })
})
