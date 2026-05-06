import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import http from 'node:http'

vi.mock('node:http', () => {
  const requestFn = vi.fn()
  return {
    default: { request: requestFn },
    request: requestFn,
  }
})

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}))

vi.mock('@sentry/electron/main', () => ({
  // suppressTracing should call its callback through and return its result.
  suppressTracing: vi.fn(<T>(cb: () => T): T => cb()),
}))

vi.mock('../toolhive-manager', () => ({
  getToolhiveSocketPath: vi.fn(() => '/tmp/toolhive.sock'),
}))

vi.mock('../headers', () => ({
  getHeaders: vi.fn(() => ({
    'X-Client-Type': 'studio',
    'X-Client-Version': '1.0.0',
  })),
}))

vi.mock('../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@common/api/generated/client', () => ({
  createClient: vi.fn((cfg: unknown) => ({ __client: true, cfg })),
}))

import * as Sentry from '@sentry/electron/main'
import { ipcMain } from 'electron'
import { getToolhiveSocketPath } from '../toolhive-manager'
import { getHeaders } from '../headers'
import log from '../logger'
import { createClient } from '@common/api/generated/client'
import {
  hasToolhiveConnection,
  createMainProcessFetch,
  createMainProcessApiClient,
  registerApiFetchHandlers,
} from '../unix-socket-fetch'

const mockHttpRequest = vi.mocked(http.request) as unknown as ReturnType<
  typeof vi.fn
>
const mockGetSocketPath = vi.mocked(getToolhiveSocketPath)
const mockGetHeaders = vi.mocked(getHeaders)
const mockSuppressTracing = vi.mocked(Sentry.suppressTracing)
const mockIpcHandle = vi.mocked(ipcMain.handle)
const mockIpcRemoveHandler = vi.mocked(ipcMain.removeHandler)
const mockCreateClient = vi.mocked(createClient)
const mockLog = vi.mocked(log)

interface FakeRequest extends EventEmitter {
  write: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

interface FakeResponse extends EventEmitter {
  statusCode?: number
  headers: http.IncomingHttpHeaders
}

/**
 * Installs an http.request stub for a single request that resolves with the
 * given response shape. Returns the captured request options + the fake req
 * object so tests can assert wire shape.
 */
function setupHttpRequest(opts: {
  status?: number
  headers?: http.IncomingHttpHeaders
  body?: string
  error?: Error
  /**
   * If true, the fake request never emits a response or error; the test is
   * responsible for driving it (e.g. for abort tests).
   */
  manualDrive?: boolean
}) {
  const fakeReq = Object.assign(new EventEmitter(), {
    write: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
  }) as FakeRequest

  let capturedOpts: http.RequestOptions | undefined
  let capturedCb: ((res: FakeResponse) => void) | undefined

  mockHttpRequest.mockImplementationOnce(
    (
      requestOpts: http.RequestOptions,
      cb: (res: FakeResponse) => void
    ): FakeRequest => {
      capturedOpts = requestOpts
      capturedCb = cb

      if (opts.manualDrive) return fakeReq

      if (opts.error) {
        // Defer error emit to next microtask.
        queueMicrotask(() => fakeReq.emit('error', opts.error))
        return fakeReq
      }

      const fakeRes = Object.assign(new EventEmitter(), {
        statusCode: opts.status,
        headers: opts.headers ?? {},
      }) as FakeResponse

      queueMicrotask(() => {
        cb(fakeRes)
        if (opts.body) fakeRes.emit('data', Buffer.from(opts.body))
        fakeRes.emit('end')
      })
      return fakeReq
    }
  )

  return {
    fakeReq,
    getCapturedOpts: () => capturedOpts,
    getCapturedCb: () => capturedCb,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSocketPath.mockReturnValue('/tmp/toolhive.sock')
  mockGetHeaders.mockReturnValue({
    'X-Client-Type': 'studio',
    'X-Client-Version': '1.0.0',
  })
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('hasToolhiveConnection', () => {
  it('returns true when getToolhiveSocketPath returns a string', () => {
    mockGetSocketPath.mockReturnValue('/tmp/foo.sock')
    expect(hasToolhiveConnection()).toBe(true)
  })

  it('returns false when getToolhiveSocketPath returns null/undefined/empty', () => {
    mockGetSocketPath.mockReturnValue(null as unknown as string)
    expect(hasToolhiveConnection()).toBe(false)
    mockGetSocketPath.mockReturnValue(undefined as unknown as string)
    expect(hasToolhiveConnection()).toBe(false)
    mockGetSocketPath.mockReturnValue('')
    expect(hasToolhiveConnection()).toBe(false)
  })
})

describe('createMainProcessFetch', () => {
  it('forwards method, path+search, headers, and body to http.request via the socket', async () => {
    const { getCapturedOpts, fakeReq } = setupHttpRequest({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
    })

    const f = createMainProcessFetch()
    const response = await f('http://localhost/api/v1/foo?x=1', {
      method: 'POST',
      headers: { 'X-Custom': 'value' },
      body: 'payload',
    })

    expect(mockHttpRequest).toHaveBeenCalledTimes(1)
    const captured = getCapturedOpts()
    expect(captured).toMatchObject({
      socketPath: '/tmp/toolhive.sock',
      method: 'POST',
      path: '/api/v1/foo?x=1',
    })
    expect(captured?.headers).toMatchObject({ 'x-custom': 'value' })
    expect(fakeReq.write).toHaveBeenCalledWith('payload')
    expect(fakeReq.end).toHaveBeenCalledTimes(1)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it.each([204, 205, 304])(
    'returns a null-body Response for status %i even when the socket returns a body',
    async (status) => {
      setupHttpRequest({
        status,
        headers: {},
        body: 'should-be-ignored',
      })

      const f = createMainProcessFetch()
      const response = await f('http://localhost/no-content')

      expect(response.status).toBe(status)
      expect(response.body).toBeNull()
    }
  )

  it('rejects with "No ToolHive socket available" when no socket is configured', async () => {
    mockGetSocketPath.mockReturnValue(undefined as unknown as string)

    const f = createMainProcessFetch()

    await expect(f('http://localhost/anything')).rejects.toThrow(
      'No ToolHive socket available'
    )
    expect(mockHttpRequest).not.toHaveBeenCalled()
  })

  it('does not call req.write when there is no body', async () => {
    const { fakeReq } = setupHttpRequest({
      status: 200,
      headers: {},
      body: '',
    })

    const f = createMainProcessFetch()
    await f('http://localhost/get', { method: 'GET' })

    expect(fakeReq.write).not.toHaveBeenCalled()
    expect(fakeReq.end).toHaveBeenCalledTimes(1)
  })

  it('rejects when http.request emits an error', async () => {
    setupHttpRequest({ error: new Error('ECONNREFUSED') })

    const f = createMainProcessFetch()
    await expect(f('http://localhost/foo')).rejects.toThrow('ECONNREFUSED')
  })

  it('serializes array-valued response headers by joining with ", "', async () => {
    setupHttpRequest({
      status: 200,
      headers: { 'set-cookie': ['a=1', 'b=2'] },
      body: '',
    })

    const f = createMainProcessFetch()
    const response = await f('http://localhost/foo')

    expect(response.headers.get('set-cookie')).toBe('a=1, b=2')
  })

  it('drops undefined response headers', async () => {
    setupHttpRequest({
      status: 200,
      headers: {
        'x-keep': 'yes',
        'x-drop': undefined,
      } as unknown as http.IncomingHttpHeaders,
      body: '',
    })

    const f = createMainProcessFetch()
    const response = await f('http://localhost/foo')

    expect(response.headers.get('x-keep')).toBe('yes')
    expect(response.headers.get('x-drop')).toBeNull()
  })

  it('defaults status to 500 when res.statusCode is undefined', async () => {
    setupHttpRequest({
      status: undefined,
      headers: {},
      body: '',
    })

    const f = createMainProcessFetch()
    const response = await f('http://localhost/foo')

    expect(response.status).toBe(500)
  })
})

describe('createMainProcessApiClient', () => {
  it('delegates to createClient with sentinel http://localhost baseUrl, headers, and a custom fetch', () => {
    const headers = { 'X-Client-Type': 'studio', 'X-Client-Version': '1.0.0' }
    mockGetHeaders.mockReturnValue(headers)

    const client = createMainProcessApiClient()

    expect(mockCreateClient).toHaveBeenCalledTimes(1)
    const cfg = mockCreateClient.mock.calls[0]?.[0] as {
      baseUrl: string
      headers: typeof headers
      fetch: unknown
    }
    expect(cfg.baseUrl).toBe('http://localhost')
    expect(cfg.headers).toEqual(headers)
    expect(typeof cfg.fetch).toBe('function')
    expect(client).toEqual({ __client: true, cfg })
  })
})

describe('registerApiFetchHandlers', () => {
  type Handler = (event: unknown, ...args: unknown[]) => unknown
  function getHandler(channel: string): Handler {
    const call = mockIpcHandle.mock.calls.find(([c]) => c === channel)
    if (!call) throw new Error(`handler for ${channel} not registered`)
    return call[1] as Handler
  }

  it('removes prior api-fetch and api-fetch-abort handlers before registering', () => {
    registerApiFetchHandlers()

    expect(mockIpcRemoveHandler).toHaveBeenCalledWith('api-fetch')
    expect(mockIpcRemoveHandler).toHaveBeenCalledWith('api-fetch-abort')
    expect(mockIpcHandle).toHaveBeenCalledWith(
      'api-fetch',
      expect.any(Function)
    )
    expect(mockIpcHandle).toHaveBeenCalledWith(
      'api-fetch-abort',
      expect.any(Function)
    )
  })

  it('api-fetch handler merges getHeaders() into the request, with renderer-supplied headers winning', async () => {
    mockGetHeaders.mockReturnValue({
      'X-Client-Type': 'studio',
      'X-Client-Version': '1.0.0',
    })

    const { getCapturedOpts } = setupHttpRequest({
      status: 200,
      headers: {},
      body: '{}',
    })

    registerApiFetchHandlers()
    const handler = getHandler('api-fetch')

    await handler(
      {},
      {
        requestId: 'req-1',
        method: 'GET',
        path: '/foo',
        headers: {
          'X-Client-Version': 'override',
          'X-Custom': 'hello',
        },
      }
    )

    const captured = getCapturedOpts()
    expect(captured?.headers).toMatchObject({
      'X-Client-Type': 'studio',
      // Renderer-supplied headers must win (spread order).
      'X-Client-Version': 'override',
      'X-Custom': 'hello',
    })
  })

  it('api-fetch handler runs inside Sentry.suppressTracing', async () => {
    setupHttpRequest({ status: 200, headers: {}, body: '{}' })

    registerApiFetchHandlers()
    const handler = getHandler('api-fetch')
    await handler(
      {},
      {
        requestId: 'req-2',
        method: 'GET',
        path: '/foo',
        headers: {},
      }
    )

    expect(mockSuppressTracing).toHaveBeenCalledTimes(1)
    expect(mockSuppressTracing.mock.calls[0]?.[0]).toBeInstanceOf(Function)
  })

  it('api-fetch handler logs and rethrows when the request errors', async () => {
    setupHttpRequest({ error: new Error('socket gone') })

    registerApiFetchHandlers()
    const handler = getHandler('api-fetch')

    await expect(
      handler(
        {},
        {
          requestId: 'req-3',
          method: 'GET',
          path: '/foo',
          headers: {},
        }
      )
    ).rejects.toThrow('socket gone')

    expect(mockLog.error).toHaveBeenCalledWith(
      '[api-fetch] Request failed: GET /foo',
      expect.any(Error)
    )
  })

  it('api-fetch-abort handler destroys the inflight request and is a no-op for unknown ids', async () => {
    // Drive a request that we keep open via manualDrive so we can abort it.
    const { fakeReq } = setupHttpRequest({ manualDrive: true })

    registerApiFetchHandlers()
    const apiHandler = getHandler('api-fetch')
    const abortHandler = getHandler('api-fetch-abort')

    // Kick off the request without awaiting (it will be aborted).
    const inflight = apiHandler(
      {},
      {
        requestId: 'req-abort',
        method: 'POST',
        path: '/foo',
        headers: {},
        body: 'payload',
      }
    )

    // Yield so the registration in the inflight map has a chance to land.
    await new Promise((r) => setImmediate(r))

    abortHandler({}, 'req-abort')
    expect(fakeReq.destroy).toHaveBeenCalledTimes(1)
    expect(mockLog.info).toHaveBeenCalledWith(
      '[api-fetch] Aborted request req-abort'
    )

    // Surfacing the destroyed request as an error keeps the promise from leaking.
    fakeReq.emit('error', new Error('aborted'))
    await expect(inflight).rejects.toThrow('aborted')

    // Aborting a request that doesn't exist is a no-op (no destroy, no log).
    fakeReq.destroy.mockClear()
    mockLog.info.mockClear()
    abortHandler({}, 'unknown-id')
    expect(fakeReq.destroy).not.toHaveBeenCalled()
    expect(mockLog.info).not.toHaveBeenCalled()
  })
})
