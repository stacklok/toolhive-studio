import type { ChildProcess } from 'node:child_process'
import log from '../../../logger'
import {
  THV_LLM_PROXY_API_KEY,
  type EnsureStartedResult,
  type LlmGatewayAuthState,
  type LlmGatewayStatus,
  type ThvLlmConfigJson,
} from './types'
import { buildLoopbackBaseURL, effectiveListenPort } from './url'
import { gatewayFetch, isAuthenticationRequiredResponse } from './fetch'
import {
  isLlmConfigured,
  readLlmConfig,
  spawnThvProcess,
  type ThvCliDeps,
} from './thv-cli'

let ownedProxyProcess: ChildProcess | undefined
let studioOwnsProxy = false
/** Last `thv llm config show` result. Cleared by invalidateLlmConfigCache
 * (save-config, disable, get-config, warmup-auth, and boot proxy start). */
let cachedConfig: ThvLlmConfigJson | null | undefined
let lastKnownModels: string[] = []
let inFlightEnsure: Promise<EnsureStartedResult> | undefined

const MODELS_LIST_TIMEOUT_MS = 15_000
const MODELS_AUTH_TIMEOUT_MS = 90_000

export function resetThvLlmGatewayStateForTests(): void {
  ownedProxyProcess = undefined
  studioOwnsProxy = false
  cachedConfig = undefined
  lastKnownModels = []
  inFlightEnsure = undefined
}

export function getLastKnownGatewayModels(): readonly string[] {
  return lastKnownModels
}

async function getConfiguredLlmConfig(
  deps: ThvCliDeps
): Promise<ThvLlmConfigJson | null> {
  if (cachedConfig !== undefined) {
    return cachedConfig
  }
  cachedConfig = await readLlmConfig(deps)
  return cachedConfig
}

export function invalidateLlmConfigCache(): void {
  cachedConfig = undefined
}

export async function resolveGatewayBaseURL(
  deps: ThvCliDeps = { binPath: '', spawnThv: spawnThvProcess }
): Promise<string | null> {
  const config = await getConfiguredLlmConfig(deps)
  if (!isLlmConfigured(config)) {
    return null
  }
  const port = effectiveListenPort(config)
  const baseURL = buildLoopbackBaseURL(port)
  return baseURL
}

async function isProxyReachable(baseURL: string): Promise<boolean> {
  try {
    const response = await gatewayFetch(`${baseURL}/models`, {
      headers: {
        Authorization: `Bearer ${THV_LLM_PROXY_API_KEY}`,
      },
      timeoutMs: 2_000,
    })
    // Any response from the proxy (including 401) means something is listening.
    return response.status > 0
  } catch {
    return false
  }
}

async function waitForProxy(baseURL: string, attempts = 20): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    if (await isProxyReachable(baseURL)) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

export function ensureProxyStarted(
  deps: ThvCliDeps = { binPath: '', spawnThv: spawnThvProcess }
): Promise<EnsureStartedResult> {
  if (!inFlightEnsure) {
    inFlightEnsure = startOwnedProxy(deps).finally(() => {
      inFlightEnsure = undefined
    })
  }
  return inFlightEnsure
}

async function startOwnedProxy(deps: ThvCliDeps): Promise<EnsureStartedResult> {
  const config = await getConfiguredLlmConfig(deps)
  if (!isLlmConfigured(config)) {
    return {
      started: false,
      alreadyRunning: false,
      studioOwnsProxy: false,
      error: 'Stacklok Gateway is not configured',
    }
  }

  const baseURL = buildLoopbackBaseURL(effectiveListenPort(config))

  if (await isProxyReachable(baseURL)) {
    return {
      started: false,
      alreadyRunning: true,
      studioOwnsProxy,
    }
  }

  if (
    ownedProxyProcess &&
    ownedProxyProcess.exitCode === null &&
    ownedProxyProcess.signalCode === null
  ) {
    const ready = await waitForProxy(baseURL)
    if (ready) {
      return {
        started: false,
        alreadyRunning: true,
        studioOwnsProxy: true,
      }
    }
  }

  try {
    const child = deps.spawnThv(['llm', 'proxy', 'start'], {
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    ownedProxyProcess = child
    studioOwnsProxy = true
    log.info('[thv-llm] started llm proxy', { pid: child.pid })

    const ready = await waitForProxy(baseURL)
    if (!ready) {
      return {
        started: true,
        alreadyRunning: false,
        studioOwnsProxy: true,
        error: 'LLM proxy did not become reachable in time',
      }
    }

    return {
      started: true,
      alreadyRunning: false,
      studioOwnsProxy: true,
    }
  } catch (error) {
    return {
      started: false,
      alreadyRunning: false,
      studioOwnsProxy: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/** Start the local proxy when Playground has opted in and llm config exists. */
export async function startConfiguredLlmProxyIfNeeded(
  deps: ThvCliDeps = { binPath: '', spawnThv: spawnThvProcess }
): Promise<EnsureStartedResult | null> {
  const { migratePlaygroundGatewayEnablement, isPlaygroundGatewayEnabled } =
    await import('./playground')
  migratePlaygroundGatewayEnablement()
  if (!isPlaygroundGatewayEnabled()) {
    log.debug(
      '[thv-llm] playground has not enabled the gateway; skipping proxy start'
    )
    return null
  }

  invalidateLlmConfigCache()
  const config = await getConfiguredLlmConfig(deps)
  if (!isLlmConfigured(config)) {
    log.debug('[thv-llm] no llm config; skipping proxy start')
    return null
  }

  const result = await ensureProxyStarted(deps)
  if (result.error) {
    log.warn('[thv-llm] proxy start on config failed', result.error)
  } else if (result.started) {
    log.info('[thv-llm] proxy started because playground gateway is enabled')
  } else if (result.alreadyRunning) {
    log.debug('[thv-llm] proxy already running')
  }
  return result
}

export async function fetchGatewayModels(
  baseURL: string,
  options?: { timeoutMs?: number }
): Promise<{ models: string[]; authRequired: boolean; error?: string }> {
  try {
    const response = await gatewayFetch(`${baseURL}/models`, {
      headers: {
        Authorization: `Bearer ${THV_LLM_PROXY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeoutMs: options?.timeoutMs ?? MODELS_LIST_TIMEOUT_MS,
    })

    const bodyText = await response.text()

    if (isAuthenticationRequiredResponse(response, bodyText)) {
      return { models: [], authRequired: true }
    }

    if (!response.ok) {
      return {
        models: lastKnownModels,
        authRequired: false,
        error: `Gateway model list failed: ${response.status} ${bodyText.slice(0, 200)}`,
      }
    }

    const data = JSON.parse(bodyText) as {
      data?: Array<{ id?: string }>
    }
    const models = (data.data ?? [])
      .map((entry) => entry.id)
      .filter((id): id is string => Boolean(id))

    if (models.length > 0) {
      lastKnownModels = models
    } else {
      lastKnownModels = []
    }

    return { models, authRequired: false }
  } catch (error) {
    return {
      models: lastKnownModels,
      authRequired: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function warmupGatewayAuth(
  deps: ThvCliDeps = { binPath: '', spawnThv: spawnThvProcess }
): Promise<{
  ready: boolean
  authState:
    'ready' | 'authenticating' | 'error' | 'not_configured' | 'proxy_stopped'
  modelCount: number
  error?: string
}> {
  const config = await getConfiguredLlmConfig(deps)
  if (!isLlmConfigured(config)) {
    return {
      ready: false,
      authState: 'not_configured',
      modelCount: 0,
      error: 'Stacklok Gateway is not configured',
    }
  }

  const ensure = await ensureProxyStarted(deps)
  if (ensure.error && !ensure.alreadyRunning && !ensure.started) {
    return {
      ready: false,
      authState: 'error',
      modelCount: 0,
      error: ensure.error,
    }
  }

  const baseURL = buildLoopbackBaseURL(effectiveListenPort(config))
  if (!(await isProxyReachable(baseURL))) {
    return {
      ready: false,
      authState: 'proxy_stopped',
      modelCount: 0,
      error: ensure.error ?? 'LLM proxy is not running',
    }
  }

  const listing = await fetchGatewayModels(baseURL, {
    timeoutMs: MODELS_AUTH_TIMEOUT_MS,
  })
  if (listing.authRequired) {
    return {
      ready: false,
      authState: 'authenticating',
      modelCount: 0,
      error:
        'Complete sign-in in your browser, then try again. The LLM proxy opened an OIDC login flow.',
    }
  }

  if (listing.error && listing.models.length === 0) {
    return {
      ready: false,
      authState: 'error',
      modelCount: 0,
      error: listing.error,
    }
  }

  return {
    ready: listing.models.length > 0,
    authState: listing.models.length > 0 ? 'ready' : 'error',
    modelCount: listing.models.length,
    error:
      listing.models.length === 0
        ? 'Gateway returned no models'
        : listing.error,
  }
}

export async function getGatewayStatus(
  deps: ThvCliDeps = { binPath: '', spawnThv: spawnThvProcess }
): Promise<LlmGatewayStatus> {
  const config = await getConfiguredLlmConfig(deps)
  if (!isLlmConfigured(config)) {
    return {
      configured: false,
      proxyRunning: false,
      authState: 'not_configured',
      listenPort: null,
      baseURL: null,
      gatewayURL: null,
      modelCount: 0,
      error: null,
      studioOwnsProxy: false,
    }
  }

  const listenPort = effectiveListenPort(config)
  const baseURL = buildLoopbackBaseURL(listenPort)
  const proxyRunning = await isProxyReachable(baseURL)

  let authState: LlmGatewayAuthState = 'proxy_stopped'
  let modelCount = lastKnownModels.length
  let error: string | null = null

  if (proxyRunning) {
    const listing = await fetchGatewayModels(baseURL)
    if (listing.authRequired) {
      authState = 'authenticating'
      error =
        'Sign in required. Start the proxy and complete OIDC login in your browser.'
    } else if (listing.error && listing.models.length === 0) {
      authState = 'error'
      error = listing.error
    } else if (listing.models.length > 0) {
      authState = 'ready'
      modelCount = listing.models.length
    } else {
      authState = 'error'
      error = listing.error ?? 'Gateway returned no models'
    }
  }

  return {
    configured: true,
    proxyRunning,
    authState,
    listenPort,
    baseURL,
    gatewayURL: config.gateway_url ?? null,
    modelCount,
    error,
    studioOwnsProxy,
  }
}

export function stopOwnedProxy(): void {
  if (!studioOwnsProxy || !ownedProxyProcess) {
    return
  }
  try {
    if (
      ownedProxyProcess.exitCode === null &&
      ownedProxyProcess.signalCode === null
    ) {
      ownedProxyProcess.kill('SIGTERM')
      log.info('[thv-llm] stopped owned llm proxy')
    }
  } catch (error) {
    log.warn('[thv-llm] failed to stop owned llm proxy', error)
  } finally {
    ownedProxyProcess = undefined
    studioOwnsProxy = false
  }
}
