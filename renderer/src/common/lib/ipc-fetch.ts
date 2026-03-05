let requestCounter = 0

function nextRequestId(): string {
  return `req-${Date.now()}-${++requestCounter}`
}

// Status codes where the browser forbids a response body (fetch spec).
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304])

/**
 * A `fetch`-compatible function that routes HTTP requests through the Electron
 * IPC bridge. The main process forwards them to the thv server over a UNIX
 * socket (or TCP as fallback).
 *
 * Plug this into the hey-api client via `client.setConfig({ fetch: ipcFetch })`
 * so all generated SDK calls transparently use the IPC transport.
 */
export const ipcFetch: typeof fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const request = new Request(input, init)
  const url = new URL(request.url)
  const requestId = nextRequestId()

  const body = request.body
    ? await new Response(request.body).text()
    : undefined

  if (request.signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }

  const abortHandler = () => {
    window.electronAPI.apiFetchAbort(requestId)
  }

  request.signal?.addEventListener('abort', abortHandler, { once: true })

  try {
    const result = await window.electronAPI.apiFetch({
      requestId,
      method: request.method,
      path: url.pathname + url.search,
      headers: Object.fromEntries(request.headers.entries()),
      body,
    })

    // The browser's Response constructor throws if you provide a body for
    // null-body status codes (204, 304, etc.).
    const responseBody = NULL_BODY_STATUSES.has(result.status)
      ? null
      : result.body

    return new Response(responseBody, {
      status: result.status,
      headers: result.headers,
    })
  } catch (err) {
    if (request.signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError')
    }
    throw err
  } finally {
    request.signal?.removeEventListener('abort', abortHandler)
  }
}
