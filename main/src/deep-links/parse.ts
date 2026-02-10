import { z } from 'zod/v4'
import log from '../logger'
import {
  DEEP_LINK_PROTOCOL,
  deepLinkSchema,
  type DeepLinkIntent,
} from '@common/deep-links'

export type ParseResult =
  | { ok: true; deepLink: DeepLinkIntent }
  | { ok: false; error: string }

export function parseDeepLinkUrl(rawUrl: string): ParseResult {
  log.debug(`[deep-link] Parsing URL: ${rawUrl}`)

  try {
    const url = new URL(rawUrl)

    if (url.protocol !== `${DEEP_LINK_PROTOCOL}:`) {
      const error = `Unsupported protocol: ${url.protocol} (expected ${DEEP_LINK_PROTOCOL}:)`
      log.warn(`[deep-link] ${error}`)
      return { ok: false, error }
    }

    const version = url.host
    const intent = url.pathname.replace(/^\//, '')
    const params = Object.fromEntries(url.searchParams)

    log.debug(
      `[deep-link] Parsed components — version: ${version}, intent: ${intent}, params: ${JSON.stringify(params)}`
    )

    const result = deepLinkSchema.safeParse({ version, intent, params })

    if (!result.success) {
      const error = `Invalid deep link: ${z.prettifyError(result.error)}`
      log.warn(`[deep-link] ${error}`)
      return { ok: false, error }
    }

    log.info(
      `[deep-link] Validated deep link: ${result.data.intent} (version: ${result.data.version})`
    )
    return { ok: true, deepLink: result.data }
  } catch (err) {
    const error = `Failed to parse URL: ${rawUrl}`
    log.warn(`[deep-link] ${error}`, err)
    return { ok: false, error }
  }
}
