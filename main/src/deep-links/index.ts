import log from '../logger'
import {
  focusMainWindow,
  sendToMainWindowRenderer,
  waitForMainWindowReady,
} from '../main-window'
import { parseDeepLinkUrl } from './parse'

export {
  parseDeepLinkUrl,
  type DeepLinkIntent,
  type ParseResult,
} from './parse'
export { registerProtocolWithSquirrel } from './squirrel'

const IPC_CHANNEL = 'deep-link-navigation'

/**
 * Extract a deep link URL from command line arguments (Windows/Linux).
 * Returns the first argument matching toolhive-gui:// or undefined.
 */
export function extractDeepLinkFromArgs(args: string[]): string | undefined {
  const match = args.find((arg) => arg.startsWith('toolhive-gui://'))
  if (match) {
    log.info(`[deep-link] Found deep link in argv: ${match}`)
  } else {
    log.info('[deep-link] No deep link found in argv')
  }
  return match
}

/**
 * Process a deep link URL end-to-end: parse, validate, wait for
 * the window to be ready, then send the intent to the renderer.
 *
 * Safe to call at any time — logs and no-ops gracefully on errors.
 */
export async function handleDeepLink(rawUrl: string): Promise<void> {
  log.info(`[deep-link] Received URL: ${rawUrl}`)

  const result = parseDeepLinkUrl(rawUrl)

  log.info('[deep-link] Focusing main window')
  focusMainWindow()

  if (!result.ok) {
    log.warn(`[deep-link] Invalid deep link: ${result.error}`)
    log.info('[deep-link] Sending error to renderer')
    sendToMainWindowRenderer(IPC_CHANNEL, { error: true })
    return
  }

  // TODO: Evaluate if pollWindowReady (used by waitForMainWindowReady) is
  // sufficient for cold-start scenarios where the app is launched via a deep
  // link. The renderer performs async initialization (fetching the ToolHive
  // port, creating the router) after the HTML loads. A more robust approach
  // would be an explicit readiness signal from the renderer.
  log.info('[deep-link] Waiting for main window to be ready')
  try {
    await waitForMainWindowReady()
    log.info('[deep-link] Main window is ready')
  } catch (error) {
    log.error('[deep-link] Window did not become ready:', error)
    return
  }

  log.info(
    `[deep-link] Dispatching intent: ${result.intent.action} (${JSON.stringify(result.intent.params)})`
  )
  sendToMainWindowRenderer(IPC_CHANNEL, result.intent)
}
