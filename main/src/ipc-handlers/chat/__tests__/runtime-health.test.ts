import { describe, it, expect, vi } from 'vitest'

vi.mock('@sentry/electron/main', () => ({
  startSpan: vi.fn((_opts: unknown, fn: (span: unknown) => unknown) =>
    fn({ setStatus: vi.fn() })
  ),
  withScope: vi.fn((fn: (scope: unknown) => void) =>
    fn({ setTag: vi.fn(), setExtras: vi.fn() })
  ),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

vi.mock('electron-store', () => ({
  default: class FakeStore {
    get() {
      return undefined
    }
    set() {
      return undefined
    }
  },
}))

vi.mock('../../../chat/runtime/adapters', () => ({
  unavailableResult: vi.fn((error?: string) => ({
    success: false,
    error: error ?? 'unavailable',
  })),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
    getName: vi.fn(() => 'ToolHive Studio'),
  },
}))

vi.mock('../../../logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    transports: { file: { resolvePathFn: null } },
  },
}))

vi.mock('../../../chat/runtime/health', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../chat/runtime/health')>()
  return {
    ...actual,
    isChatRuntimeReady: vi.fn(() => true),
  }
})

import { registerChatHealthHandler } from '../../../ipc-handlers/chat/runtime-health'
import { isChatRuntimeReady } from '../../../chat/runtime/health'
import { ipcMain } from 'electron'

describe('chat runtime IPC boundary', () => {
  it('registers a health probe without changing channel naming', () => {
    registerChatHealthHandler()
    expect(ipcMain.handle).toHaveBeenCalledWith(
      'chat:runtime:health',
      expect.any(Function)
    )
  })

  it('reports readiness from the runtime health module', async () => {
    registerChatHealthHandler()
    const handler = vi.mocked(ipcMain.handle).mock.calls.at(-1)?.[1]
    expect(handler).toBeTypeOf('function')
    const result = await (handler as () => Promise<{ ready: boolean }>)()
    expect(result).toEqual({ ready: true })
    expect(isChatRuntimeReady).toHaveBeenCalled()
  })
})
