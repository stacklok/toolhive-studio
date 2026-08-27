type GatewayFetchInit = RequestInit & { timeoutMs?: number }

/** Normalize fetch() input so Request objects are not stringified to `[object Request]`. */
export function resolveGatewayFetchInput(
  input: RequestInfo | URL,
  init?: GatewayFetchInit
): { url: string; init?: GatewayFetchInit } {
  if (typeof input === 'string') {
    return { url: input, init }
  }
  if (input instanceof URL) {
    return { url: input.href, init }
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return {
      url: input.url,
      init: {
        method: input.method,
        headers: input.headers,
        body: input.body,
        ...init,
      },
    }
  }
  return { url: String(input), init }
}

export async function gatewayFetchFromInput(
  input: RequestInfo | URL,
  init?: GatewayFetchInit
): Promise<Response> {
  const resolved = resolveGatewayFetchInput(input, init)
  return gatewayFetch(resolved.url, resolved.init)
}

/** Refuse redirects so a hostile loopback listener cannot bounce requests off-host. */
export async function gatewayFetch(
  url: string,
  init: GatewayFetchInit = {}
): Promise<Response> {
  const { timeoutMs = 15_000, ...requestInit } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...requestInit,
      signal: controller.signal,
      redirect: 'manual',
    })
  } finally {
    clearTimeout(timer)
  }
}

export function isAuthenticationRequiredResponse(
  response: Response,
  bodyText?: string
): boolean {
  if (response.status !== 401) {
    return false
  }
  if (!bodyText) {
    return true
  }
  try {
    const parsed = JSON.parse(bodyText) as { error?: string }
    return (
      parsed.error === 'authentication_required' ||
      /authentication/i.test(bodyText)
    )
  } catch {
    return /authentication/i.test(bodyText)
  }
}
