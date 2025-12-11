import * as testingLibraryMatchers from '@testing-library/jest-dom/matchers'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, expect, beforeAll, beforeEach, vi, afterAll } from 'vitest'
import failOnConsole from 'vitest-fail-on-console'
import { client } from './api/generated/client.gen'
import { resetAllAutoAPIMocks } from './renderer/src/common/mocks/autoAPIMock'
import { server } from './renderer/src/common/mocks/node'
import type { ElectronAPI } from './preload/src/preload'

expect.extend(testingLibraryMatchers)

beforeEach(() => {
  resetAllAutoAPIMocks()
})

afterEach(() => {
  cleanup()
})

beforeAll(() => {
  if (!(window as unknown as { electronAPI?: ElectronAPI }).electronAPI) {
    const electronStub: Partial<ElectronAPI> = {
      onServerShutdown: () => () => {},
      shutdownStore: {
        getLastShutdownServers: async () => [],
        clearShutdownHistory: async () => ({ success: true }),
      } as ElectronAPI['shutdownStore'],
      getInstanceId: async () => 'test-instance-id',
    }
    Object.defineProperty(window, 'electronAPI', {
      value: electronStub as ElectronAPI,
      writable: true,
    })
  }
  server.listen({
    onUnhandledRequest: 'error',
  })
  client.setConfig({
    baseUrl: 'https://foo.bar.com',
    fetch,
  })

  // Globally reduce UI delays to a negligible amount in tests
  vi.mock('@utils/delay', () => ({
    delay: (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, Math.min(ms, 10))),
  }))

  vi.mock('electron-log/renderer', () => ({
    default: new Proxy(
      {},
      {
        get: () => vi.fn(() => new Proxy({}, { get: () => vi.fn() })),
      }
    ),
  }))

  vi.mock('sonner', () => ({
    Toaster: () => null,
    toast: {
      dismiss: vi.fn(),
      promise: vi.fn((p: Promise<unknown>) => p.catch(() => {})),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      loading: vi.fn(),
    },
  }))

  window.HTMLElement.prototype.scrollIntoView = function () {}
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  // Prevent jsdom from attempting navigation when clicking download links
  if (window.HTMLAnchorElement) {
    window.HTMLAnchorElement.prototype.click = vi.fn()
  }

  global.ResizeObserver = class ResizeObserver {
    disconnect() {
      // do nothing
    }
    observe() {
      // do nothing
    }
    unobserve() {
      // do nothing
    }
  }
})
afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})
afterAll(() => server.close())

vi.mock('./renderer/src/common/hooks/use-feature-flag', async (orig) => {
  const original = (await orig()) as Record<string, unknown>
  return {
    ...original,
    useFeatureFlag: () => true,
  }
})

const SILENCED_MESSAGES = ['Not implemented: navigation (except hash changes)']

failOnConsole({
  shouldFailOnDebug: false,
  shouldFailOnError: true,
  shouldFailOnInfo: false,
  shouldFailOnLog: false,
  shouldFailOnWarn: true,
  silenceMessage: (message: string) => {
    return SILENCED_MESSAGES.some((m) => message.includes(m))
  },
})
