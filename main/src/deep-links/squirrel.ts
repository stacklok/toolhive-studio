import { app } from 'electron'
import path from 'node:path'
import log from '../logger'
import { DEEP_LINK_PROTOCOL } from './intents'

/**
 * Register the toolhive-gui:// protocol handler.
 *
 * On Windows with Squirrel packaging, the binary path includes the version
 * number (e.g. app-1.2.3/ToolHive.exe). After auto-updates the old path is
 * stale. Using Update.exe as the registered executable ensures the protocol
 * survives updates.
 *
 * On other platforms, the standard registration is sufficient.
 */
export function registerProtocolWithSquirrel(): void {
  if (process.platform === 'win32' && app.isPackaged) {
    const updateExe = path.resolve(process.execPath, '..', '..', 'Update.exe')
    const success = app.setAsDefaultProtocolClient(
      DEEP_LINK_PROTOCOL,
      updateExe,
      ['--processStart', path.basename(process.execPath)]
    )
    log.info(
      `[deep-link] Registered protocol via Squirrel Update.exe: ${success}`
    )
  } else {
    const success = app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL)
    log.info(`[deep-link] Registered protocol: ${success}`)
  }
}
