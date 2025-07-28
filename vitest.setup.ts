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

vi.mock('./renderer/src/feature-flags/index.ts', () => {
  return {
    isFeatureEnabled: () => true,
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
