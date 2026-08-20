import { DEFAULT_THV_LLM_PROXY_PORT } from './types'

export function effectiveListenPort(config: {
  proxy?: { listen_port?: number }
}): number {
  const port = config.proxy?.listen_port
  if (typeof port === 'number' && port > 0) {
    return port
  }
  return DEFAULT_THV_LLM_PROXY_PORT
}

export function buildLoopbackBaseURL(listenPort: number): string {
  return `http://127.0.0.1:${listenPort}/v1`
}

export function anthropicBaseURLFromGatewayEndpoint(
  endpointURL: string
): string {
  const parsed = new URL(endpointURL)
  return `${parsed.protocol}//${parsed.host}/anthropic/v1`
}

export function googleBaseURLFromGatewayEndpoint(endpointURL: string): string {
  const parsed = new URL(endpointURL)
  return `${parsed.protocol}//${parsed.host}/v1beta`
}

export function isClaudeGatewayModel(modelId: string): boolean {
  const id = modelId.trim().toLowerCase()
  return id.includes('claude') || id.startsWith('anthropic.')
}

export function isGeminiGatewayModel(modelId: string): boolean {
  const id = modelId.trim().toLowerCase()
  return id.includes('gemini') || id.startsWith('google.')
}

export function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase()
  if (normalized === 'localhost') {
    return true
  }
  // IPv4 loopback only — no DNS resolution.
  const parts = normalized.split('.')
  if (parts.length !== 4) {
    return false
  }
  if (parts[0] !== '127') {
    return false
  }
  return parts.every((part) => {
    const n = Number(part)
    return Number.isInteger(n) && n >= 0 && n <= 255
  })
}

export function assertLoopbackBaseURL(baseURL: string): void {
  let parsed: URL
  try {
    parsed = new URL(baseURL)
  } catch {
    throw new Error(`Invalid gateway base URL: ${baseURL}`)
  }
  if (parsed.protocol !== 'http:') {
    throw new Error('Stacklok Gateway must use http on loopback')
  }
  if (!isLoopbackHost(parsed.hostname)) {
    throw new Error('Stacklok Gateway base URL must be loopback-only')
  }
}
