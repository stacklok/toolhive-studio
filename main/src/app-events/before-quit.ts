import { app } from 'electron'
import { getTearingDownState, getQuittingState } from '../app-state'
import { showNativeQuitConfirmation } from '../quit-confirmation'
import { blockQuit } from './block-quit'
import log from '../logger'

export function register() {
  app.on('before-quit', async (e) => {
    // Already tearing down – let the quit proceed
    if (getTearingDownState()) return

    // Already in quitting state (blockQuit was called) – let it proceed
    if (getQuittingState()) return

    // Prevent the default quit synchronously so the app stays alive
    // while the native dialog is shown. This is critical during OS
    // shutdown: the OS sees the modal dialog and will not force-kill.
    e.preventDefault()

    // Show the native confirmation dialog (async to support the
    // "Don't ask me again" checkbox, which only the async variant offers).
    let confirmed = false
    try {
      confirmed = await showNativeQuitConfirmation()
    } catch (error) {
      // If the dialog fails (e.g. during OS shutdown), fall back to
      // proceeding with quit rather than leaving it blocked.
      log.error(
        '[before-quit] Failed to show quit confirmation dialog, proceeding with quit',
        error
      )
      confirmed = true
    }

    if (!confirmed) {
      log.info('[before-quit] User cancelled quit')
      return
    }

    blockQuit('before-quit')
  })
}
