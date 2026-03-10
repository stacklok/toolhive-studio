import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appOn: vi.fn(),
}))

vi.mock('electron', () => ({
  app: { on: mocks.appOn },
  BrowserWindow: { getAllWindows: vi.fn(() => []) },
}))
vi.mock('../../main-window')
vi.mock('../../dock-utils')
vi.mock('../../logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { register } from '../activate'

describe('activate', () => {
  it('registers an activate handler on app', () => {
    register()
    expect(mocks.appOn).toHaveBeenCalledWith('activate', expect.any(Function))
  })
})
