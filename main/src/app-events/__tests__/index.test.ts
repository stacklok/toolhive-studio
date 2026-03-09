import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  registerWhenReady: vi.fn(),
  registerWindowAllClosed: vi.fn(),
  registerActivate: vi.fn(),
  registerWillFinishLaunching: vi.fn(),
  registerBeforeQuit: vi.fn(),
  registerWillQuit: vi.fn(),
  registerQuit: vi.fn(),
  registerProcessSignals: vi.fn(),
  registerProcessExit: vi.fn(),
}))

vi.mock('../when-ready', () => ({ register: mocks.registerWhenReady }))
vi.mock('../window-all-closed', () => ({
  register: mocks.registerWindowAllClosed,
}))
vi.mock('../activate', () => ({ register: mocks.registerActivate }))
vi.mock('../will-finish-launching', () => ({
  register: mocks.registerWillFinishLaunching,
}))
vi.mock('../before-quit', () => ({ register: mocks.registerBeforeQuit }))
vi.mock('../will-quit', () => ({ register: mocks.registerWillQuit }))
vi.mock('../quit', () => ({ register: mocks.registerQuit }))
vi.mock('../process-signals', () => ({
  register: mocks.registerProcessSignals,
}))
vi.mock('../process-exit', () => ({ register: mocks.registerProcessExit }))
vi.mock('../block-quit', () => ({ blockQuit: vi.fn() }))

import { registerAllEvents } from '../index'

describe('registerAllEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls every event registration function exactly once', () => {
    registerAllEvents()

    expect(mocks.registerWhenReady).toHaveBeenCalledOnce()
    expect(mocks.registerWindowAllClosed).toHaveBeenCalledOnce()
    expect(mocks.registerActivate).toHaveBeenCalledOnce()
    expect(mocks.registerWillFinishLaunching).toHaveBeenCalledOnce()
    expect(mocks.registerBeforeQuit).toHaveBeenCalledOnce()
    expect(mocks.registerWillQuit).toHaveBeenCalledOnce()
    expect(mocks.registerQuit).toHaveBeenCalledOnce()
    expect(mocks.registerProcessSignals).toHaveBeenCalledOnce()
    expect(mocks.registerProcessExit).toHaveBeenCalledOnce()
  })

  it('registers will-finish-launching before when-ready', () => {
    registerAllEvents()

    const launchingOrder =
      mocks.registerWillFinishLaunching.mock.invocationCallOrder[0]!
    const readyOrder = mocks.registerWhenReady.mock.invocationCallOrder[0]!
    expect(launchingOrder).toBeLessThan(readyOrder)
  })
})
