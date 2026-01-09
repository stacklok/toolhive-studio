export const VALID_PROXY_MODES = ['sse', 'streamable-http'] as const

export type ProxyMode = (typeof VALID_PROXY_MODES)[number]

export const DEFAULT_PROXY_MODE: ProxyMode = 'streamable-http'

export function isValidProxyMode(
  value: string | undefined
): value is ProxyMode {
  return Boolean(value && VALID_PROXY_MODES.includes(value as ProxyMode))
}

export function getProxyModeOrDefault(value: string | undefined): ProxyMode {
  return isValidProxyMode(value) ? value : DEFAULT_PROXY_MODE
}
