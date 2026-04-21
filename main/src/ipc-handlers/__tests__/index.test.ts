import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  registerApp: vi.fn(),
  registerAutoUpdate: vi.fn(),
  registerChat: vi.fn(),
  registerCli: vi.fn(),
  registerDarkMode: vi.fn(),
  registerDialogs: vi.fn(),
  registerFeatureFlags: vi.fn(),
  registerTelemetry: vi.fn(),
  registerToolhive: vi.fn(),
  registerUiPreferences: vi.fn(),
  registerUtils: vi.fn(),
  registerWindow: vi.fn(),
}))

vi.mock('../app', () => ({ register: mocks.registerApp }))
vi.mock('../auto-update', () => ({ register: mocks.registerAutoUpdate }))
vi.mock('../chat', () => ({ register: mocks.registerChat }))
vi.mock('../cli', () => ({ register: mocks.registerCli }))
vi.mock('../dark-mode', () => ({ register: mocks.registerDarkMode }))
vi.mock('../dialogs', () => ({ register: mocks.registerDialogs }))
vi.mock('../feature-flags', () => ({ register: mocks.registerFeatureFlags }))
vi.mock('../telemetry', () => ({ register: mocks.registerTelemetry }))
vi.mock('../toolhive', () => ({ register: mocks.registerToolhive }))
vi.mock('../ui-preferences', () => ({
  register: mocks.registerUiPreferences,
}))
vi.mock('../utils', () => ({ register: mocks.registerUtils }))
vi.mock('../window', () => ({ register: mocks.registerWindow }))

import { registerAllHandlers } from '../index'

describe('registerAllHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls every handler registration function exactly once', () => {
    registerAllHandlers()

    expect(mocks.registerApp).toHaveBeenCalledOnce()
    expect(mocks.registerAutoUpdate).toHaveBeenCalledOnce()
    expect(mocks.registerChat).toHaveBeenCalledOnce()
    expect(mocks.registerCli).toHaveBeenCalledOnce()
    expect(mocks.registerDarkMode).toHaveBeenCalledOnce()
    expect(mocks.registerDialogs).toHaveBeenCalledOnce()
    expect(mocks.registerFeatureFlags).toHaveBeenCalledOnce()
    expect(mocks.registerTelemetry).toHaveBeenCalledOnce()
    expect(mocks.registerToolhive).toHaveBeenCalledOnce()
    expect(mocks.registerUiPreferences).toHaveBeenCalledOnce()
    expect(mocks.registerUtils).toHaveBeenCalledOnce()
    expect(mocks.registerWindow).toHaveBeenCalledOnce()
  })
})
