import * as testingLibraryMatchers from '@testing-library/jest-dom/matchers'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, expect, beforeAll, vi, afterAll } from 'vitest'
import failOnConsole from 'vitest-fail-on-console'
import { client } from './api/generated/client.gen'
import { server } from './renderer/src/common/mocks/node'

expect.extend(testingLibraryMatchers)

afterEach(() => {
  cleanup()
})

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  })
  client.setConfig({
    baseUrl: 'https://foo.bar.com',
    fetch,
  })

  vi.mock('electron-log/renderer', () => ({
    default: new Proxy(
      {},
      {
        get: () => vi.fn(() => new Proxy({}, { get: () => vi.fn() })),
      }
    ),
  }))

  window.HTMLElement.prototype.scrollIntoView = function () {}
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()

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
  const original = await orig()
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
