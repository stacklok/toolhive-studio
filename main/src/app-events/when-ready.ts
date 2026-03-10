import { app, nativeTheme, session } from 'electron'
import { getDb } from '../db/database'
import { runMigrations } from '../db/migrator'
import { reconcileFromStore } from '../db/reconcile-from-store'
import { resetUpdateState, initAutoUpdate } from '../auto-update'
import { validateCliAlignment, handleValidationResult } from '../cli'
import { setCliValidationResult, getTray } from '../app-state'
import { initTray, safeTrayDestroy } from '../system-tray'
import { createApplicationMenu } from '../menu'
import {
  startToolhive,
  getToolhivePort,
  isToolhiveRunning,
  stopToolhive,
} from '../toolhive-manager'
import { getMainWindow, createMainWindow, hideMainWindow } from '../main-window'
import { extractDeepLinkFromArgs, handleDeepLink } from '../deep-links'
import { getCspString } from '../csp'
import log from '../logger'

export function register() {
  app.whenReady().then(async () => {
    // Initialize SQLite database, run migrations, and reconcile from electron-store
    try {
      getDb()
      runMigrations()
      reconcileFromStore()
    } catch (err) {
      log.error('[DB] Database initialization failed:', err)
    }

    resetUpdateState()

    // ──────────────────────────────────────────────────────────────────────────
    //  CLI Alignment Validation (THV-0020)
    //  Skip in dev mode since bundled CLI may not exist.
    //  Validation result is stored for renderer to query - renderer shows UI for
    //  issues that require user interaction (external CLI, broken/tampered symlink).
    //  Set FORCE_CLI_VALIDATION=true to test validation in dev mode.
    // ──────────────────────────────────────────────────────────────────────────
    const shouldValidateCli =
      app.isPackaged || process.env.FORCE_CLI_VALIDATION === 'true'
    if (shouldValidateCli) {
      const validation = await validateCliAlignment()
      const result = await handleValidationResult(validation)
      setCliValidationResult(result)
      log.info(`CLI validation result: ${result.status}`)
    } else {
      log.info('Skipping CLI alignment validation in dev mode')
      setCliValidationResult({ status: 'valid' })
    }

    // Initialize tray first
    try {
      initTray({ toolHiveIsRunning: false }) // Start with false, will update after ToolHive starts
      log.info('System tray initialized successfully')
      // Setup application menu
      createApplicationMenu()
    } catch (error) {
      log.error('Failed to initialize system tray: ', error)
    }

    // Initialize auto-update system
    initAutoUpdate({
      mainWindowGetter: () => getMainWindow(),
      windowCreator: () => createMainWindow(),
    })

    // Start ToolHive with tray reference
    await startToolhive()

    // Create main window
    try {
      const mainWindow = await createMainWindow()

      if (mainWindow) {
        mainWindow.webContents.on('before-input-event', (event, input) => {
          const isCmdQ =
            process.platform === 'darwin' &&
            input.meta &&
            input.key.toLowerCase() === 'q'
          const isCtrlQ =
            process.platform !== 'darwin' &&
            input.control &&
            input.key.toLowerCase() === 'q'

          if (isCmdQ || isCtrlQ) {
            event.preventDefault()
            log.info('CmdOrCtrl+Q pressed, hiding window')
            try {
              hideMainWindow()
            } catch (error) {
              log.error('Failed to hide window on keyboard shortcut:', error)
            }
          }
        })

        mainWindow.webContents.once('did-finish-load', () => {
          log.info('Main window did-finish-load event triggered')
        })

        // Windows-specific: Handle system shutdown/restart/logout
        if (process.platform === 'win32') {
          mainWindow.on('session-end', (event) => {
            log.info(
              `[session-end] Windows session ending (reasons: ${event.reasons.join(', ')}), forcing cleanup...`
            )
            stopToolhive()
            safeTrayDestroy()
          })
        }
      }
    } catch (error) {
      log.error('Failed to create main window:', error)
    }

    // Handle deep link URL from initial cold launch (Windows/Linux).
    // On macOS this is handled by the 'open-url' event in will-finish-launching.
    if (process.platform !== 'darwin') {
      const initialDeepLink = extractDeepLinkFromArgs(process.argv)
      if (initialDeepLink) {
        log.info(`[deep-link] Cold start with deep link: ${initialDeepLink}`)
        // TODO: Evaluate if pollWindowReady is sufficient for cold start or if
        // we need an explicit readiness signal from the renderer
        handleDeepLink(initialDeepLink)
      }
    }

    // Setup CSP headers
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (process.env.NODE_ENV === 'development') {
        return callback({ responseHeaders: details.responseHeaders })
      }
      const port = getToolhivePort()
      if (port == null) {
        throw new Error('[content-security-policy] ToolHive port is not set')
      }
      return callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            getCspString(port, import.meta.env.VITE_SENTRY_DSN),
          ],
        },
      })
    })

    // Non-Windows platforms: refresh tray icon when theme changes
    nativeTheme.on('updated', () => {
      if (getTray() && process.platform !== 'win32') {
        try {
          getTray()?.destroy()
          initTray({ toolHiveIsRunning: isToolhiveRunning() })
        } catch (error) {
          log.error('Failed to update tray after theme change: ', error)
        }
      }
    })
  })
}
