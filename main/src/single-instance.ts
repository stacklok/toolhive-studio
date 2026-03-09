import { app } from 'electron'
import { extractDeepLinkFromArgs, handleDeepLink } from './deep-links'
import { focusMainWindow } from './main-window'
import log from './logger'

/**
 * Acquire the single-instance lock and register the second-instance handler.
 * If another instance is already running, exits immediately.
 */
export function enforceSingleInstance() {
  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    // This is the second instance (e.g. launched by a deep link or duplicate click).
    // The first instance handles the deep link via the 'second-instance' event.
    // We use process.exit(0) instead of app.quit() because quit() is async —
    // its lifecycle events let app.whenReady() fire and briefly create a window.
    log.info('Another instance is already running. Exiting...')
    process.exit(0)
  }

  app.on('second-instance', (_event, argv) => {
    log.info(
      `[deep-link] second-instance event received with argv: ${argv.join(' ')}`
    )
    const deepLinkUrl = extractDeepLinkFromArgs(argv)
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl) // focuses window internally
    } else {
      focusMainWindow()
    }
  })
}
