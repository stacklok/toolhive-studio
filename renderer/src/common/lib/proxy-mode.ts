const VALID_PROXY_MODES = ['sse', 'streamable-http'] as const

export type ProxyMode = (typeof VALID_PROXY_MODES)[number]

const DEFAULT_PROXY_MODE: ProxyMode = 'streamable-http'

function isValidProxyMode(value: string | undefined): value is ProxyMode {
  return Boolean(value && VALID_PROXY_MODES.includes(value as ProxyMode))
}

export function getProxyModeOrDefault(
  value: string | undefined,
  transport: string | undefined
): ProxyMode | undefined {
  // store proxy_mode only for stdio transport
  if (transport === 'stdio') {
    return undefined
  }
  return isValidProxyMode(value) ? value : DEFAULT_PROXY_MODE
}
