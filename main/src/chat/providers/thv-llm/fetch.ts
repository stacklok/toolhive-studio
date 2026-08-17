import http from 'node:http'

/** Refuse redirects so a hostile loopback listener cannot bounce requests off-host. */
export async function gatewayFetch(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
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

/** Node http agent placeholder for tests documenting redirect refusal policy. */
export function createRedirectRefusingHttpClient(): http.Agent {
  return new http.Agent({ keepAlive: true })
}
