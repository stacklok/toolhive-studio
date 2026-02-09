import log from '../logger'
import {
  focusMainWindow,
  sendToMainWindowRenderer,
  waitForMainWindowReady,
} from '../main-window'
import { parseDeepLinkUrl } from './parse'
import {
  DEEP_LINK_PROTOCOL,
  showNotFound,
  resolveDeepLinkTarget,
} from '@common/deep-links'

export { registerProtocolWithSquirrel } from './squirrel'

const IPC_CHANNEL = 'deep-link-navigation'

/**
 * Extract a deep link URL from command line arguments (Windows/Linux).
 * Returns the first argument matching toolhive-gui:// or undefined.
 */
export function extractDeepLinkFromArgs(args: string[]): string | undefined {
  const match = args.find((arg) => arg.startsWith(`${DEEP_LINK_PROTOCOL}://`))
  if (match) {
    log.info(`[deep-link] Found deep link in argv: ${match}`)
  } else {
    log.debug('[deep-link] No deep link found in argv')
  }
  return match
}

/**
 * Process a deep link URL end-to-end: parse, validate, wait for
 * the window to be ready, then send the deep link to the renderer.
 *
 * Safe to call at any time — logs and no-ops gracefully on errors.
 */
export async function handleDeepLink(rawUrl: string): Promise<void> {
  log.info(`[deep-link] Received URL: ${rawUrl}`)

  const result = parseDeepLinkUrl(rawUrl)

  log.debug('[deep-link] Focusing main window')
  focusMainWindow()

  // TODO: Evaluate if pollWindowReady (used by waitForMainWindowReady) is
  // sufficient for cold-start scenarios where the app is launched via a deep
  // link. The renderer performs async initialization (fetching the ToolHive
  // port, creating the router) after the HTML loads. A more robust approach
  // would be an explicit readiness signal from the renderer.
  log.debug('[deep-link] Waiting for main window to be ready')
  try {
    await waitForMainWindowReady()
    log.debug('[deep-link] Main window is ready')
  } catch (error) {
    log.error('[deep-link] Window did not become ready:', error)
    return
  }

  const target = result.ok
    ? resolveDeepLinkTarget(result.deepLink)
    : showNotFound.navigate({})

  log.info(`[deep-link] Navigating renderer to: ${target.to}`, target.params)
  sendToMainWindowRenderer(IPC_CHANNEL, target)
}
