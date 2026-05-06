import http from 'node:http'
import { ipcMain } from 'electron'
import log from './logger'
import { getToolhiveSocketPath, getToolhivePort } from './toolhive-manager'
import { getHeaders } from './headers'
import { createClient, type Client } from '@common/api/generated/client'

interface ApiFetchRequest {
  requestId: string
  method: string
  path: string
  headers: Record<string, string>
  body?: string
}

interface ApiFetchResponse {
  status: number
  headers: Record<string, string>
  body: string
}

const inflightRequests = new Map<string, http.ClientRequest>()

function serializeResponseHeaders(
  raw: http.IncomingHttpHeaders
): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) {
      headers[key] = Array.isArray(value) ? value.join(', ') : value
    }
  }
  return headers
}

function performRequest(
  connectionOpts: { socketPath: string } | { hostname: string; port: number },
  opts: {
    method: string
    path: string
    headers: Record<string, string>
    body?: string
  },
  requestId?: string
): Promise<ApiFetchResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        ...connectionOpts,
        method: opts.method,
        path: opts.path,
        headers: opts.headers,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          if (requestId) inflightRequests.delete(requestId)
          resolve({
            status: res.statusCode ?? 500,
            headers: serializeResponseHeaders(res.headers),
            body: Buffer.concat(chunks).toString('utf-8'),
          })
        })
      }
    )

    if (requestId) inflightRequests.set(requestId, req)

    req.on('error', (err) => {
      if (requestId) inflightRequests.delete(requestId)
      reject(err)
    })

    if (opts.body) req.write(opts.body)
    req.end()
  })
}

function getConnectionOpts():
  | { socketPath: string }
  | { hostname: string; port: number } {
  const socketPath = getToolhiveSocketPath()
  if (socketPath) return { socketPath }

  const port = getToolhivePort()
  if (port) return { hostname: '127.0.0.1', port }

  throw new Error('No ToolHive connection available (no socket path or port)')
}

/**
 * Returns whether a thv connection (socket or TCP) is currently available.
 * Use this to short-circuit code paths that would otherwise build a client
 * eagerly during bootstrap when thv has not started yet.
 */
export function hasToolhiveConnection(): boolean {
  return !!getToolhiveSocketPath() || !!getToolhivePort()
}

/**
 * Creates a hey-api Client configured to talk to the local thv API. Routing
 * is handled by `createMainProcessFetch`, so callers do not need to know
 * whether the transport is a UNIX socket or TCP. The `baseUrl` is a sentinel
 * — the custom fetch ignores it and dials the live transport.
 */
export function createMainProcessApiClient(): Client {
  return createClient({
    baseUrl: 'http://localhost',
    headers: getHeaders(),
    fetch: createMainProcessFetch(),
  })
}

/**
 * Creates a `fetch`-compatible function that routes requests through a UNIX
 * socket (or TCP fallback). Intended for use in the main process (e.g. the
 * graceful-exit client) where Node.js APIs are available.
 */
export function createMainProcessFetch(): typeof fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const body = request.body
      ? await new Response(request.body).text()
      : undefined

    const result = await performRequest(getConnectionOpts(), {
      method: request.method,
      path: url.pathname + url.search,
      headers: Object.fromEntries(request.headers.entries()),
      body,
    })

    return new Response(result.body, {
      status: result.status,
      headers: result.headers,
    })
  }
}

/**
 * Registers IPC handlers that let the renderer make API requests through the
 * main process. The main process then forwards them over the UNIX socket (or
 * TCP port as fallback) to the thv server.
 */
export function registerApiFetchHandlers(): void {
  ipcMain.removeHandler('api-fetch')
  ipcMain.removeHandler('api-fetch-abort')

  ipcMain.handle(
    'api-fetch',
    async (_event, opts: ApiFetchRequest): Promise<ApiFetchResponse> => {
      const rawHeaders = getHeaders()
      const telemetryHeaders: Record<string, string> = {}
      for (const [k, v] of Object.entries(rawHeaders)) {
        telemetryHeaders[k] = String(v)
      }
      const mergedHeaders = { ...telemetryHeaders, ...opts.headers }

      try {
        return await performRequest(
          getConnectionOpts(),
          {
            method: opts.method,
            path: opts.path,
            headers: mergedHeaders,
            body: opts.body,
          },
          opts.requestId
        )
      } catch (err) {
        log.error(
          `[api-fetch] Request failed: ${opts.method} ${opts.path}`,
          err
        )
        throw err
      }
    }
  )

  ipcMain.handle('api-fetch-abort', (_event, requestId: string) => {
    const req = inflightRequests.get(requestId)
    if (req) {
      req.destroy()
      inflightRequests.delete(requestId)
      log.info(`[api-fetch] Aborted request ${requestId}`)
    }
  })
}
