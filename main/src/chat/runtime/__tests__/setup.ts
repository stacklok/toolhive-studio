import { vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
    getName: vi.fn(() => 'ToolHive Studio'),
    on: vi.fn(),
    once: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  webContents: {
    getAllWebContents: vi.fn(() => []),
  },
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

vi.mock('../../logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    transports: { file: { resolvePathFn: null } },
  },
}))

vi.mock('@sentry/electron/main', () => ({
  startSpanManual: vi.fn(
    async (
      _opts: unknown,
      fn: (span: { spanContext: () => object }, finish: () => void) => unknown
    ) =>
      fn(
        {
          spanContext: () => ({}),
          setStatus: vi.fn(),
          setAttribute: vi.fn(),
          setAttributes: vi.fn(),
        } as {
          spanContext: () => object
          setStatus: () => void
          setAttribute: () => void
          setAttributes: () => void
        },
        vi.fn()
      )
  ),
  startSpan: vi.fn(
    (
      _opts: unknown,
      fn: (span: { addLink: () => void; setStatus?: () => void }) => unknown
    ) => fn({ addLink: vi.fn(), setStatus: vi.fn() })
  ),
  addBreadcrumb: vi.fn(),
  withScope: vi.fn(
    (fn: (scope: { setTag: () => void; setExtras: () => void }) => void) =>
      fn({ setTag: vi.fn(), setExtras: vi.fn() })
  ),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

vi.mock('../../toolhive-manager', () => ({
  isToolhiveRunning: vi.fn(() => false),
  binPath: '/tmp/thv',
}))

vi.mock('../../unix-socket-fetch', () => ({
  createMainProcessApiClient: vi.fn(),
  createMainProcessFetch: vi.fn(),
}))
