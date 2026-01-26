import { vi } from 'vitest'
import type { ElectronAPI } from '../../../../preload/src/preload'

/**
 * Base electronAPI stub with common mocked properties.
 * This matches what's set up in vitest.setup.ts
 */
export const baseElectronStub: Partial<ElectronAPI> = {
  onServerShutdown: () => () => {},
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
  },
  featureFlags: {
    get: vi.fn().mockResolvedValue(false),
    enable: vi.fn().mockResolvedValue(undefined),
    disable: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue({}),
  },
  chat: {
    stream: vi.fn(),
  },
  on: vi.fn(),
  removeListener: vi.fn(),
}

/**
 * Extends the global electronAPI stub with test-specific properties.
 * Use this instead of completely overriding window.electronAPI.
 *
 * @example
 * ```ts
 * beforeEach(() => {
 *   extendElectronAPI({
 *     platform: 'darwin',
 *     getMainLogContent: vi.fn(),
 *   })
 * })
 * ```
 */
export function extendElectronAPI(
  extensions: Partial<ElectronAPI>
): Partial<ElectronAPI> {
  const extended = {
    ...baseElectronStub,
    ...extensions,
  }
  Object.defineProperty(window, 'electronAPI', {
    value: extended as ElectronAPI,
    writable: true,
    configurable: true,
  })
  return extended
}

/**
 * Resets electronAPI to the base stub.
 * Call this in afterEach if you used extendElectronAPI.
 */
export function resetElectronAPI(): void {
  Object.defineProperty(window, 'electronAPI', {
    value: baseElectronStub as ElectronAPI,
    writable: true,
    configurable: true,
  })
}
