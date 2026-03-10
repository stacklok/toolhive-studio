import { app } from 'electron'
import started from 'electron-squirrel-startup'
import { existsSync } from 'node:fs'
import { registerAllEvents } from './app-events'
import { registerProtocolWithSquirrel } from './deep-links'
import { registerAllHandlers } from './ipc-handlers'
import log from './logger'
import { initSentry } from './sentry'
import { enforceSingleInstance } from './single-instance'
import { binPath } from './toolhive-manager'

initSentry()

// Environment variables are now handled in mainWindow.ts

log.info(`ToolHive binary path: ${binPath}`)
log.info(`Binary file exists: ${existsSync(binPath)}`)

// ────────────────────────────────────────────────────────────────────────────
//  Single Instance Lock - Prevent multiple instances
// ────────────────────────────────────────────────────────────────────────────
enforceSingleInstance()

// ────────────────────────────────────────────────────────────────────────────
//  Windows-installer helper (Squirrel)
// ────────────────────────────────────────────────────────────────────────────
if (started) {
  app.quit()
}

// ────────────────────────────────────────────────────────────────────────────
//  Deep Link Protocol Registration
// ────────────────────────────────────────────────────────────────────────────
registerProtocolWithSquirrel()

// ────────────────────────────────────────────────────────────────────────────
//  Register all app lifecycle events
//  (whenReady, window-all-closed, activate, before-quit, quit, etc.)
// ────────────────────────────────────────────────────────────────────────────
registerAllEvents()

// ────────────────────────────────────────────────────────────────────────────
//  Register all IPC handlers
//  (app, dark-mode, window, toolhive, telemetry, auto-update, dialogs, etc.)
// ────────────────────────────────────────────────────────────────────────────
registerAllHandlers()
