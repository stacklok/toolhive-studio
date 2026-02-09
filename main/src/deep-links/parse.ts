import { z } from 'zod/v4'
import log from '../logger'

const PROTOCOL = 'toolhive-gui:'

const safeString = z.string().regex(/^[a-zA-Z0-9_.-]+$/)

const openRegistryServerDetailIntent = z.object({
  version: z.literal('v1'),
  action: z.literal('open-registry-server-detail'),
  params: z.object({
    serverName: safeString,
  }),
})

const showNotFoundIntent = z.object({
  version: z.literal('v1'),
  action: z.literal('show-not-found'),
  params: z.object({}),
})

// Extend this union as new deep link intents are added
const deepLinkIntent = z.discriminatedUnion('action', [
  openRegistryServerDetailIntent,
  showNotFoundIntent,
])

export type DeepLinkIntent = z.infer<typeof deepLinkIntent>

export type ParseResult =
  | { ok: true; intent: DeepLinkIntent }
  | { ok: false; error: string }

export function parseDeepLinkUrl(rawUrl: string): ParseResult {
  log.info(`[deep-link] Parsing URL: ${rawUrl}`)

  try {
    const url = new URL(rawUrl)

    if (url.protocol !== PROTOCOL) {
      const error = `Unsupported protocol: ${url.protocol} (expected ${PROTOCOL})`
      log.warn(`[deep-link] ${error}`)
      return { ok: false, error }
    }

    const version = url.host
    const action = url.pathname.replace(/^\//, '')
    const params = Object.fromEntries(url.searchParams)

    log.info(
      `[deep-link] Parsed components — version: ${version}, action: ${action}, params: ${JSON.stringify(params)}`
    )

    const result = deepLinkIntent.safeParse({ version, action, params })

    if (!result.success) {
      const error = `Invalid deep link: ${z.prettifyError(result.error)}`
      log.warn(`[deep-link] Validation failed: ${error}`)
      return { ok: false, error }
    }

    log.info(
      `[deep-link] Validated intent: ${result.data.action} (version: ${result.data.version})`
    )
    return { ok: true, intent: result.data }
  } catch (err) {
    const error = `Failed to parse URL: ${rawUrl}`
    log.warn(`[deep-link] ${error}`, err)
    return { ok: false, error }
  }
}
