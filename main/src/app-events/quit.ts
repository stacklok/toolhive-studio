import { app } from 'electron'
import { getTearingDownState } from '../app-state'
import { stopToolhive } from '../toolhive-manager'
import { safeTrayDestroy } from '../system-tray'
import { closeDb } from '../db/database'
import log from '../logger'

export function register() {
  app.on('quit', () => {
    log.info('[quit event] Ensuring ToolHive cleanup...')
    // Only cleanup if not already tearing down to avoid double cleanup
    if (!getTearingDownState()) {
      stopToolhive()
      safeTrayDestroy()
    }
    closeDb()
  })
}
