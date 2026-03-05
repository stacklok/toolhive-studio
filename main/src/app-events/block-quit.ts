import { app } from 'electron'
import {
  getTearingDownState,
  setTearingDownState,
  setQuittingState,
} from '../app-state'
import {
  recreateMainWindowForShutdown,
  sendToMainWindowRenderer,
} from '../main-window'
import { stopToolhive, binPath } from '../toolhive-manager'
import { stopAllServers } from '../graceful-exit'
import { createMainProcessFetch } from '../unix-socket-fetch'
import { safeTrayDestroy } from '../system-tray'
import { delay } from '../../../utils/delay'
import log from '../logger'

/** Hold the quit, run teardown, then really exit. */
export async function blockQuit(source: string, event?: Electron.Event) {
  if (getTearingDownState()) return
  setTearingDownState(true)
  setQuittingState(true)
  log.info(`[${source}] initiating graceful teardown...`)

  if (event) {
    event.preventDefault()
  }

  try {
    const shutdownWindow = await recreateMainWindowForShutdown()

    if (shutdownWindow) {
      sendToMainWindowRenderer('graceful-exit')

      // Give renderer time to navigate to shutdown page
      await delay(500)
    }
  } catch (err) {
    log.error('Failed to send graceful-exit message: ', err)
  }

  try {
    await stopAllServers(binPath, { createFetch: createMainProcessFetch })
  } catch (err) {
    log.error('Teardown failed: ', err)
  } finally {
    // Stop the embedded ToolHive server
    stopToolhive()

    safeTrayDestroy()
    app.quit()
  }
}
