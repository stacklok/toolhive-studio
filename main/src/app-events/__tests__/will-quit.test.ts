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
vi.mock('../block-quit')

import { register } from '../will-quit'

describe('will-quit', () => {
  it('registers a will-quit handler on app', () => {
    register()
    expect(mocks.appOn).toHaveBeenCalledWith('will-quit', expect.any(Function))
  })
})
