export const THV_LLM_PROVIDER_ID = 'thv-llm' as const

export const THV_LLM_PROVIDER_NAME = 'Stacklok Gateway'

/** SQLite endpointURL marker: Playground has opted in to this provider. */
export const THV_LLM_PLAYGROUND_ENABLED_MARKER = 'enabled'

export const THV_LLM_PROXY_API_KEY = 'thv-proxy'

export const DEFAULT_THV_LLM_PROXY_PORT = 14000

/** Shape of `thv llm config show --format json`. */
export interface ThvLlmConfigJson {
  gateway_url?: string
  oidc?: {
    issuer?: string
    client_id?: string
    audience?: string
    callback_port?: number
  }
  proxy?: {
    listen_port?: number
  }
}

/** Connection settings persisted via `thv llm config set` (same flags as setup). */
export interface LlmGatewaySetupInput {
  gatewayUrl: string
  issuer: string
  clientId: string
  audience?: string
  callbackPort?: number
  proxyPort?: number
}

export interface LlmGatewayConfigForm extends LlmGatewaySetupInput {
  configured: boolean
}

export type LlmGatewayAuthState =
  'not_configured' | 'proxy_stopped' | 'authenticating' | 'ready' | 'error'

export interface LlmGatewayStatus {
  configured: boolean
  proxyRunning: boolean
  authState: LlmGatewayAuthState
  listenPort: number | null
  baseURL: string | null
  gatewayURL: string | null
  modelCount: number
  error: string | null
  studioOwnsProxy: boolean
}

export interface EnsureStartedResult {
  started: boolean
  alreadyRunning: boolean
  studioOwnsProxy: boolean
  error?: string
}

export interface WarmupAuthResult {
  ready: boolean
  authState: LlmGatewayAuthState
  modelCount: number
  error?: string
}
