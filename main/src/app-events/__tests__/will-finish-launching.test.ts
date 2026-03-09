import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appOn: vi.fn(),
}))

vi.mock('electron', () => ({
  app: { on: mocks.appOn },
}))
vi.mock('../../deep-links')
vi.mock('../../logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { register } from '../will-finish-launching'

describe('will-finish-launching', () => {
  it('registers a will-finish-launching handler on app', () => {
    register()
    expect(mocks.appOn).toHaveBeenCalledWith(
      'will-finish-launching',
      expect.any(Function)
    )
  })
})
