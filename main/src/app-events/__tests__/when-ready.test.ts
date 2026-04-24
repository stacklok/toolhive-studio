import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  whenReady: vi.fn(() => ({ then: vi.fn() })),
}))

vi.mock('electron', () => ({
  app: { whenReady: mocks.whenReady, isPackaged: false, getPath: vi.fn() },
  autoUpdater: { on: vi.fn(), setFeedURL: vi.fn() },
  dialog: { showMessageBox: vi.fn() },
  ipcMain: { handle: vi.fn() },
  nativeTheme: { on: vi.fn() },
  session: { defaultSession: { webRequest: { onHeadersReceived: vi.fn() } } },
}))
vi.mock('@sentry/electron/main', () => ({ startSpan: vi.fn(), init: vi.fn() }))
vi.mock('electron-store', () => ({
  default: vi.fn(function Store() {
    return { get: vi.fn(), set: vi.fn() }
  }),
}))
vi.mock('../../db/database')
vi.mock('../../db/migrator')
vi.mock('../../db/reconcile-from-store')
vi.mock('../../chat/agents/registry', () => ({
  seedBuiltinAgents: vi.fn(),
}))
vi.mock('../../auto-update')
vi.mock('../../cli')
vi.mock('../../app-state')
vi.mock('../../system-tray')
vi.mock('../../menu')
vi.mock('../../toolhive-manager')
vi.mock('../../main-window')
vi.mock('../../deep-links')
vi.mock('../../csp')
vi.mock('../../logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { register } from '../when-ready'

describe('when-ready', () => {
  it('registers via app.whenReady()', () => {
    register()
    expect(mocks.whenReady).toHaveBeenCalledOnce()
  })
})
