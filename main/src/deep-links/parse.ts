import { z } from 'zod/v4'

const PROTOCOL = 'toolhive-gui:'

const safeString = z.string().regex(/^[a-zA-Z0-9_.-]+$/)

const openRegistryServerDetailIntent = z.object({
  version: z.literal('v1'),
  action: z.literal('open-registry-server-detail'),
  params: z.object({
    serverName: safeString,
  }),
})

// Extend this union as new deep link intents are added
const deepLinkIntent = z.discriminatedUnion('action', [
  openRegistryServerDetailIntent,
])

export type DeepLinkIntent = z.infer<typeof deepLinkIntent>

export type ParseResult =
  | { ok: true; intent: DeepLinkIntent }
  | { ok: false; error: string }

export function parseDeepLinkUrl(rawUrl: string): ParseResult {
  try {
    const url = new URL(rawUrl)

    if (url.protocol !== PROTOCOL) {
      return {
        ok: false,
        error: `Unsupported protocol: ${url.protocol} (expected ${PROTOCOL})`,
      }
    }

    const version = url.host
    const action = url.pathname.replace(/^\//, '')
    const params = Object.fromEntries(url.searchParams)

    const result = deepLinkIntent.safeParse({ version, action, params })

    if (!result.success) {
      return {
        ok: false,
        error: `Invalid deep link: ${z.prettifyError(result.error)}`,
      }
    }

    return { ok: true, intent: result.data }
  } catch {
    return { ok: false, error: `Failed to parse URL: ${rawUrl}` }
  }
}
