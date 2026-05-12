import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Sentry from '@sentry/electron/renderer'
import { ipcFetch } from '../ipc-fetch'

vi.mock('@sentry/electron/renderer', () => ({
  getTraceData: vi.fn(() => ({})),
}))

const getTraceDataMock = vi.mocked(Sentry.getTraceData)

function mockApiFetch(impl?: Parameters<typeof vi.fn>[0]) {
  const fn = impl ? vi.fn(impl) : vi.fn()
  window.electronAPI.apiFetch =
    fn as unknown as typeof window.electronAPI.apiFetch
  return fn
}

function mockApiFetchAbort() {
  const fn = vi.fn().mockResolvedValue(undefined)
  window.electronAPI.apiFetchAbort =
    fn as unknown as typeof window.electronAPI.apiFetchAbort
  return fn
}

const okResult = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: '{"hello":"world"}',
}

describe('ipcFetch', () => {
  beforeEach(() => {
    getTraceDataMock.mockReturnValue({})
  })

  it('forwards method/path/headers/body to apiFetch and returns a Response', async () => {
    const apiFetch = mockApiFetch(async () => okResult)

    const response = await ipcFetch(
      'http://localhost/api/v1/workloads?all=true',
      {
        method: 'POST',
        headers: { 'X-Custom': 'value', 'content-type': 'application/json' },
        body: '{"foo":"bar"}',
      }
    )

    expect(apiFetch).toHaveBeenCalledTimes(1)
    const args = apiFetch.mock.calls[0]?.[0]
    expect(args).toMatchObject({
      method: 'POST',
      path: '/api/v1/workloads?all=true',
      body: '{"foo":"bar"}',
      headers: expect.objectContaining({
        'x-custom': 'value',
        'content-type': 'application/json',
      }),
    })
    expect(typeof args.requestId).toBe('string')
    expect(args.requestId).toMatch(/^req-/)

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    await expect(response.json()).resolves.toEqual({ hello: 'world' })
  })

  it('generates a fresh requestId per call', async () => {
    const apiFetch = mockApiFetch(async () => okResult)

    await ipcFetch('http://localhost/a')
    await ipcFetch('http://localhost/b')

    const idA = apiFetch.mock.calls[0]?.[0].requestId
    const idB = apiFetch.mock.calls[1]?.[0].requestId
    expect(idA).toBeTruthy()
    expect(idB).toBeTruthy()
    expect(idA).not.toBe(idB)
  })

  it('merges Sentry trace headers (sentry-trace, baggage, traceparent)', async () => {
    getTraceDataMock.mockReturnValue({
      'sentry-trace': 'trace-123',
      baggage: 'sentry-trace_id=abc',
      traceparent: '00-trace-123-span-456-01',
    })
    const apiFetch = mockApiFetch(async () => okResult)

    await ipcFetch('http://localhost/foo')

    expect(getTraceDataMock).toHaveBeenCalledWith({
      propagateTraceparent: true,
    })
    const headers = apiFetch.mock.calls[0]?.[0].headers
    expect(headers['sentry-trace']).toBe('trace-123')
    expect(headers.baggage).toBe('sentry-trace_id=abc')
    expect(headers.traceparent).toBe('00-trace-123-span-456-01')
  })

  it('omits Sentry trace headers that are not returned by getTraceData', async () => {
    getTraceDataMock.mockReturnValue({
      'sentry-trace': 'trace-only',
    })
    const apiFetch = mockApiFetch(async () => okResult)

    await ipcFetch('http://localhost/foo')

    const headers = apiFetch.mock.calls[0]?.[0].headers
    expect(headers['sentry-trace']).toBe('trace-only')
    expect(headers.baggage).toBeUndefined()
    expect(headers.traceparent).toBeUndefined()
  })

  it('lets Sentry trace headers win over caller-supplied trace headers', async () => {
    getTraceDataMock.mockReturnValue({
      'sentry-trace': 'sentry-wins',
      traceparent: '00-fresh-trace-id-fresh-span-01',
    })
    const apiFetch = mockApiFetch(async () => okResult)

    await ipcFetch('http://localhost/foo', {
      headers: {
        'sentry-trace': 'caller-supplied',
        traceparent: 'caller-supplied-traceparent',
      },
    })

    const headers = apiFetch.mock.calls[0]?.[0].headers
    expect(headers['sentry-trace']).toBe('sentry-wins')
    expect(headers.traceparent).toBe('00-fresh-trace-id-fresh-span-01')
  })

  // 101 is also in NULL_BODY_STATUSES but jsdom's Response constructor rejects
  // statuses outside 200-599, so we exercise the remaining null-body codes here.
  it.each([204, 205, 304])(
    'returns a null-body Response for status %i even if main returns a body string',
    async (status) => {
      mockApiFetch(async () => ({
        status,
        headers: {},
        body: 'should-be-ignored',
      }))

      const response = await ipcFetch('http://localhost/no-content')

      expect(response.status).toBe(status)
      expect(response.body).toBeNull()
    }
  )

  it('returns the body from main for non-null-body statuses (e.g. 200)', async () => {
    mockApiFetch(async () => ({
      status: 200,
      headers: { 'content-type': 'text/plain' },
      body: 'hello',
    }))

    const response = await ipcFetch('http://localhost/text')

    await expect(response.text()).resolves.toBe('hello')
  })

  it('throws AbortError synchronously when the signal is already aborted, without calling apiFetch', async () => {
    const apiFetch = mockApiFetch(async () => okResult)
    const controller = new AbortController()
    controller.abort()

    await expect(
      ipcFetch('http://localhost/x', { signal: controller.signal })
    ).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('aborting in-flight calls apiFetchAbort with the requestId and surfaces an AbortError', async () => {
    // In real life, apiFetchAbort destroys the underlying http.ClientRequest
    // which causes apiFetch to reject. We simulate that here so that the
    // catch branch with `signal.aborted` runs.
    let rejectApiFetch: (err: unknown) => void = () => {}
    const apiFetch = mockApiFetch(
      () =>
        new Promise<typeof okResult>((_, reject) => {
          rejectApiFetch = reject
        })
    )
    const apiFetchAbort = mockApiFetchAbort()

    const controller = new AbortController()
    const promise = ipcFetch('http://localhost/x', {
      signal: controller.signal,
    })

    // Wait a tick so the abort handler is wired up.
    await new Promise((r) => setTimeout(r, 0))

    controller.abort()
    rejectApiFetch(new Error('Request aborted by client'))

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(apiFetchAbort).toHaveBeenCalledTimes(1)
    expect(apiFetchAbort).toHaveBeenCalledWith(
      apiFetch.mock.calls[0]?.[0].requestId
    )
  })

  // Behavioral check: aborting the controller AFTER ipcFetch settles must not
  // call apiFetchAbort, which proves the listener was removed in `finally`.
  it('removes the abort listener on success', async () => {
    mockApiFetch(async () => okResult)
    const apiFetchAbort = mockApiFetchAbort()
    const controller = new AbortController()

    await ipcFetch('http://localhost/x', { signal: controller.signal })

    controller.abort()
    await new Promise((r) => setTimeout(r, 0))

    expect(apiFetchAbort).not.toHaveBeenCalled()
  })

  it('removes the abort listener when apiFetch rejects', async () => {
    mockApiFetch(async () => {
      throw new Error('boom')
    })
    const apiFetchAbort = mockApiFetchAbort()
    const controller = new AbortController()

    await expect(
      ipcFetch('http://localhost/x', { signal: controller.signal })
    ).rejects.toThrow('boom')

    controller.abort()
    await new Promise((r) => setTimeout(r, 0))

    expect(apiFetchAbort).not.toHaveBeenCalled()
  })

  it('propagates non-abort errors from apiFetch unchanged', async () => {
    const failure = new Error('IPC bridge unavailable')
    mockApiFetch(async () => {
      throw failure
    })

    await expect(ipcFetch('http://localhost/x')).rejects.toBe(failure)
  })
})
