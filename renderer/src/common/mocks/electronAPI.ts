import { vi } from 'vitest'
import type { ElectronAPI } from '../../../../preload/src/preload'

/**
 * Creates a fresh electronAPI stub with default mock implementations.
 */
function createElectronStub(): Partial<ElectronAPI> {
  return {
    onServerShutdown: () => () => {},
    onDeepLinkNavigation: () => () => {},
    getSkipQuitConfirmation: vi.fn().mockResolvedValue(false),
    setSkipQuitConfirmation: vi.fn().mockResolvedValue(undefined),
    shutdownStore: {
      getLastShutdownServers: async () => [],
      clearShutdownHistory: async () => ({ success: true }),
    } as ElectronAPI['shutdownStore'],
    getInstanceId: async () => 'test-instance-id',
    darkMode: {
      toggle: vi.fn().mockResolvedValue(false),
      system: vi.fn().mockResolvedValue(false),
      get: vi.fn().mockResolvedValue({
        shouldUseDarkColors: false,
        themeSource: 'system',
      }),
      set: vi.fn().mockResolvedValue(true),
    } as ElectronAPI['darkMode'],
    featureFlags: {
      get: vi.fn().mockResolvedValue(false),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue({}),
    } as ElectronAPI['featureFlags'],
    chat: {
      stream: vi.fn(),
    } as unknown as ElectronAPI['chat'],
    mcpCompliance: {
      runChecks: vi.fn().mockResolvedValue({
        serverName: 'mock-server',
        checkedAt: new Date().toISOString(),
        totalDurationMs: 0,
        summary: {
          total: 0,
          passed: 0,
          warnings: 0,
          failed: 0,
          skipped: 0,
        },
        checks: [],
      }),
    } as ElectronAPI['mcpCompliance'],
    on: vi.fn(),
    removeListener: vi.fn(),
  }
}

/**
 * Resets electronAPI to a fresh stub with default values.
 * Called automatically in global beforeEach.
 * Tests can then directly mutate window.electronAPI as needed.
 *
 * @example
 * ```ts
 * // In your test:
 * beforeEach(() => {
 *   // global reset already happened, just override what you need:
 *   window.electronAPI.platform = 'darwin'
 *   window.electronAPI.getMainLogContent = vi.fn()
 * })
 * ```
 */
export function resetElectronAPI(): void {
  Object.defineProperty(window, 'electronAPI', {
    value: createElectronStub() as ElectronAPI,
    writable: true,
    configurable: true,
  })
}

/**
 * Convenience helper to set feature flag values for testing.
 *
 * @example
 * ```ts
 * beforeEach(() => {
 *   setFeatureFlags({ my_feature: true, other_feature: false })
 * })
 * ```
 */
export function setFeatureFlags(flags: Record<string, boolean>): void {
  window.electronAPI.featureFlags = {
    get: vi
      .fn()
      .mockImplementation((flag: string) =>
        Promise.resolve(flags[flag] ?? false)
      ),
    getAll: vi.fn().mockResolvedValue(flags),
    enable: vi.fn().mockResolvedValue(undefined),
    disable: vi.fn().mockResolvedValue(undefined),
  } as typeof window.electronAPI.featureFlags
}
