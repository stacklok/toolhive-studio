import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appOn: vi.fn(),
}))

vi.mock('electron', () => ({
  app: { on: mocks.appOn, quit: vi.fn() },
}))

import { register } from '../window-all-closed'

describe('window-all-closed', () => {
  it('registers a window-all-closed handler on app', () => {
    register()
    expect(mocks.appOn).toHaveBeenCalledWith(
      'window-all-closed',
      expect.any(Function)
    )
  })
})
