import { app, autoUpdater, dialog, ipcMain, type BrowserWindow } from 'electron'
import { updateElectronApp } from 'update-electron-app'
import * as Sentry from '@sentry/electron/main'
import { stopAllServers } from './graceful-exit'
import {
  stopToolhive,
  getToolhivePort,
  binPath,
  isToolhiveRunning,
} from './toolhive-manager'
import { safeTrayDestroy } from './system-tray'
import { getAppVersion, pollWindowReady } from './util'
import { delay } from '../../utils/delay'
import log from './logger'
import { setQuittingState, setTearingDownState } from './app-state'
import Store from 'electron-store'
import { fetchLatestRelease } from './utils/toolhive-version'
import { writeSetting } from './db/writers/settings-writer'
import { readSetting } from './db/readers/settings-reader'
import { getFeatureFlag } from './feature-flags/flags'
import { featureFlagKeys } from '../../utils/feature-flags'

export type UpdateState =
  | 'checking'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'not-available'
  | 'none'

const store = new Store<{
  isAutoUpdateEnabled: boolean
}>({ name: 'auto-update', defaults: { isAutoUpdateEnabled: true } })

let pendingUpdateVersion: string | null = null
let updateState: UpdateState = 'none'

async function safeServerShutdown(): Promise<boolean> {
  try {
    const port = getToolhivePort()
    if (!port) {
      log.info('[update] No ToolHive port available, skipping server shutdown')
      return true
    }

    await stopAllServers(binPath, port)

    log.info('[update] All servers stopped successfully')
    return true
  } catch (error) {
    log.error('[update] Server shutdown failed: ', error)
    return false
  }
}

async function installUpdateAndRestart() {
  if (updateState === 'installing') {
    log.warn('[update] Update installation already in progress via IPC')
    return { success: false, error: 'Update already in progress' }
  }

  log.info(
    `[update] installing update and restarting application via IPC ${pendingUpdateVersion || 'unknown'}`
  )

  try {
    await performUpdateInstallation({
      releaseName: pendingUpdateVersion,
      installByNotification: true,
    })
    return { success: true }
  } catch (error) {
    log.error('[update] IPC update installation failed: ', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function handleUpdateError({
  message,
  rootSpan,
  rootFinish,
}: {
  message: Error
  rootSpan: Sentry.Span
  rootFinish: () => void
}) {
  Sentry.startSpan(
    {
      name: 'Auto-update error',
      op: 'update.error',
      parentSpan: rootSpan,
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        update_flow: 'true',
        update_state: updateState,
        toolhive_running: `${isToolhiveRunning()}`,
      },
    },
    (startSpan) => {
      try {
        log.error(
          '[update] there was a problem updating the application: ',
          message
        )
        log.info('[update] update state: ', updateState)
        log.info('[update] toolhive binary is running: ', isToolhiveRunning())

        startSpan.setStatus({
          code: 2,
          message: message instanceof Error ? message.message : String(message),
        })
        updateState = 'none'

        // Finish init span with error when update fails
        rootSpan.setStatus({
          code: 2,
          message: 'Update failed',
        })
        rootFinish()
      } catch (error) {
        log.error('[update] error during auto-update error:', error)
        startSpan.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  )
}

function handleUpdateNotAvailable({
  rootSpan,
  rootFinish,
}: {
  rootSpan: Sentry.Span
  rootFinish: () => void
}) {
  Sentry.startSpan(
    {
      name: 'Update not available',
      op: 'update.not_available',
      parentSpan: rootSpan,
      attributes: {
        update_flow: 'true',
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        current_version: getAppVersion(),
        update_state: updateState,
        toolhive_running: `${isToolhiveRunning()}`,
      },
    },
    () => {
      if (updateState === 'downloading') {
        log.warn(
          '[update] update became unavailable during download - ignoring'
        )
        return
      }
      log.info('[update] no update available')

      updateState = 'not-available'

      rootSpan.setStatus({ code: 1 })
      rootFinish()
    }
  )
}

function handleUpdateAvailable(rootSpan: Sentry.Span) {
  Sentry.startSpan(
    {
      name: 'Update available',
      op: 'update.available',
      parentSpan: rootSpan,
      attributes: {
        update_flow: 'true',
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        current_version: getAppVersion(),
        update_state: updateState,
        toolhive_running: `${isToolhiveRunning()}`,
      },
    },
    () => {
      log.info('[update] update is available, starting download...')
      updateState = 'downloading'
    }
  )
}

function handleUpdateChecking(rootSpan: Sentry.Span) {
  Sentry.startSpan(
    {
      name: 'Checking for update',
      op: 'update.checking',
      parentSpan: rootSpan,
      attributes: {
        update_flow: 'true',
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        current_version: getAppVersion(),
        toolhive_running: `${isToolhiveRunning()}`,
        update_state: updateState,
      },
    },
    () => {
      log.info('[update] checking for updates...')
      updateState = 'checking'
    }
  )
}

async function handleUpdateDownloaded({
  rootSpan,
  rootFinish,
  releaseName,
  isAutoUpdateEnabled,
}: {
  rootSpan: Sentry.Span
  rootFinish: () => void
  releaseName: string | null
  isAutoUpdateEnabled: boolean
}) {
  // Phase 1: Prepare dialog (fast, technical operation)
  const mainWindow = await Sentry.startSpanManual(
    {
      name: 'Prepare update dialog',
      op: 'update.downloaded',
      parentSpan: rootSpan,
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        update_flow: 'true',
        release_name: releaseName || 'unknown',
        update_state: updateState,
        toolhive_running: `${isToolhiveRunning()}`,
        is_auto_update_enabled: `${isAutoUpdateEnabled}`,
      },
    },
    async (span, finish): Promise<BrowserWindow | null> => {
      try {
        if (updateState === 'installing') {
          log.warn(
            '[update] Update already in progress, ignoring duplicate event'
          )
          span.setStatus({
            code: 2,
            message: 'Update already in progress',
          })
          finish()
          return null
        }

        log.info('[update] downloaded - preparing dialog')
        pendingUpdateVersion = releaseName
        updateState = 'downloaded'

        let window = mainWindowGetter?.()

        // check if destroyed is important for not crashing the app
        if (!window || window.isDestroyed()) {
          log.warn(
            '[update] MainWindow not available, recreating for update dialog'
          )
          if (!windowCreator) {
            log.error('[update] Window creator not initialized')
            span.setStatus({
              code: 2,
              message: 'Window creator not initialized',
            })
            finish()
            return null
          }
          window = await windowCreator()
          await pollWindowReady(window)
        }

        if (window.isMinimized() && !window.isDestroyed()) {
          window.restore()
        }

        span.setStatus({ code: 1 })
        finish()
        return window
      } catch (error) {
        log.error('[update] Failed to prepare update dialog:', error)
        span.setStatus({
          code: 2,
          message:
            error instanceof Error
              ? `Failed to prepare dialog: ${error.message}`
              : 'Failed to prepare dialog',
        })
        finish()
        return null
      }
    }
  )

  if (!mainWindow || mainWindow.isDestroyed()) {
    // Fallback: send notification to renderer
    const fallbackWindow = mainWindowGetter?.()
    if (fallbackWindow && !fallbackWindow.isDestroyed()) {
      fallbackWindow.webContents.send('update-downloaded')
    }
    return
  }

  // Phase 2: Show dialog and wait for user decision (user interaction time)
  const dialogOpts = {
    type: 'info' as const,
    buttons: ['Restart', 'Later'],
    cancelId: 1,
    defaultId: 0,
    title: `Release ${releaseName}`,
    message:
      process.platform === 'darwin'
        ? `Release ${releaseName}`
        : 'A new version has been downloaded.\nThe update will be applied on the next application restart.',
    detail:
      process.platform === 'darwin'
        ? 'A new version has been downloaded.\nThe update will be applied on the next application restart.'
        : `Ready to install ${releaseName}`,
    icon: undefined,
  }

  let userChoice: 'restart' | 'later' | 'error' = 'error'

  try {
    const returnValue = await dialog.showMessageBox(mainWindow, dialogOpts)
    userChoice = returnValue.response === 0 ? 'restart' : 'later'
  } catch (error) {
    log.error('[update] Dialog error in update-downloaded handler:', error)
    userChoice = 'error'
    // Fallback: send notification
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded')
    }
  }

  // Track user decision with timing (separate span, not blocking)
  Sentry.startSpan(
    {
      name: `User update decision ${userChoice}`,
      op: `update.user_decision`,
      parentSpan: rootSpan,
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        update_flow: 'true',
        release_name: releaseName || 'unknown',
        user_choice: userChoice,
        update_state: updateState,
        toolhive_running: `${isToolhiveRunning()}`,
        is_auto_update_enabled: `${isAutoUpdateEnabled}`,
      },
    },
    () => {
      log.info(`[update] User decision: ${userChoice}`)
    }
  )

  // Phase 3: Handle user choice
  if (userChoice === 'restart') {
    rootSpan.setStatus({ code: 1 })
    rootFinish()
    try {
      await performUpdateInstallation({
        releaseName: releaseName || 'unknown',
        rootSpan,
        rootFinish,
      })
    } catch (error) {
      // Error already logged and recovery attempted in performUpdateInstallation
      log.error('[update] Installation failed after recovery attempt:', error)
    }
  } else {
    updateState = 'none'
    log.info(
      '[update] user deferred update installation - showing toast notification'
    )
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded')
    }

    rootSpan.setStatus({ code: 1 })
    rootFinish()
  }
}

async function performUpdateInstallation({
  releaseName,
  installByNotification = false,
  rootSpan,
  rootFinish,
}: {
  releaseName: string | null
  installByNotification?: boolean
  rootSpan?: Sentry.Span
  rootFinish?: () => void
}) {
  return Sentry.startSpanManual(
    {
      name: 'Auto-update installation',
      op: 'update.install',
      ...(rootSpan ? { parentSpan: rootSpan } : {}),
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        update_flow: 'true',
        release_name: releaseName || 'unknown',
        update_state: updateState,
        is_installing_by_ui_notification: `${installByNotification}`,
        toolhive_running: `${isToolhiveRunning()}`,
      },
    },
    async (span, finish) => {
      if (updateState === 'installing') {
        log.warn('[update] Update installation already in progress')
        span.setStatus({ code: 2, message: 'Already in progress' })
        finish()
        if (rootFinish) {
          rootFinish()
        }
        return
      }

      log.info(
        `[update] installing update to version: ${releaseName || 'unknown'}`
      )
      updateState = 'installing'

      try {
        // Remove event listeners to avoid interference
        log.info('[update] removing quit listeners to avoid interference')
        app.removeAllListeners('before-quit')
        app.removeAllListeners('will-quit')

        setQuittingState(true)
        setTearingDownState(true)

        log.info('[update] starting graceful shutdown before update...')

        // Notify renderer of graceful exit
        const mainWindow = mainWindowGetter?.()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('graceful-exit')
          // Give renderer time to handle the event
          await delay(500)
        }

        const shutdownSuccess = await safeServerShutdown()
        if (!shutdownSuccess) {
          log.warn(
            '[update] Server shutdown failed, proceeding with update anyway'
          )
        }

        try {
          stopToolhive()
          log.info('[update] ToolHive stopped')
        } catch (error) {
          log.error('[update] Error stopping ToolHive: ', error)
        }

        safeTrayDestroy()

        log.info('[update] all cleaned up, preparing for quit...')

        span.setStatus({ code: 1 })
        finish()
        if (rootFinish) {
          rootFinish()
        }

        try {
          const flushResult = await Sentry.flush(2000) // Wait max 2 seconds for Sentry to send data
          log.info(`[update] Sentry flush completed: ${flushResult}`)
        } catch (error) {
          log.warn('[update] Sentry flush error:', error)
        }

        log.info('[update] calling autoUpdater.quitAndInstall()...')
        autoUpdater.quitAndInstall()
      } catch (error) {
        log.error('[update] error during update installation:', error)
        span.setStatus({
          code: 2,
          message:
            error instanceof Error
              ? `[update] error during update installation, ${error?.name} - ${error?.message}`
              : `[update] error during update installation ${JSON.stringify(error)}`,
        })
        finish()
        if (rootFinish) {
          rootFinish()
        }
        updateState = 'none'

        // Attempt recovery
        try {
          safeTrayDestroy()
          log.info('[update] attempting app relaunch after update failure')
          // this creates a new app instance
          app.relaunch()
          //  this quits the current instance
          app.quit()
        } catch (recoveryError) {
          log.error('[update] recovery failed: ', recoveryError)
          // Force quit as last resort
          process.exit(1)
        }

        throw error
      }
    }
  )
}

let mainWindowGetter: (() => BrowserWindow | null) | null = null
let windowCreator: (() => Promise<BrowserWindow>) | null = null

export function initAutoUpdate({
  isManualUpdate = false,
  mainWindowGetter: getterParam,
  windowCreator: creatorParam,
}: {
  isManualUpdate?: boolean
  mainWindowGetter: () => BrowserWindow | null
  windowCreator: () => Promise<BrowserWindow>
}) {
  const isAutoUpdateEnabled = store.get('isAutoUpdateEnabled')
  return Sentry.startSpanManual(
    {
      name: 'Auto-update initialization',
      op: 'update.init',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        update_flow: 'true',
        is_manual_update: isManualUpdate,
        update_state: updateState,
        toolhive_running: `${isToolhiveRunning()}`,
        is_auto_update_enabled: `${isAutoUpdateEnabled}`,
      },
    },
    async (rootSpan, rootFinish) => {
      try {
        // Always save references first, so manualUpdate() can work even if auto-update is disabled
        mainWindowGetter = getterParam
        windowCreator = creatorParam

        if (!isAutoUpdateEnabled && !isManualUpdate) {
          log.info('[update] Auto update is disabled, skipping initialization')
          rootSpan.setStatus({ code: 1 })
          rootFinish()
          return
        }

        resetAllUpdateState()

        // Remove any existing listeners to prevent duplicates
        autoUpdater.removeAllListeners()
        ipcMain.removeHandler('install-update-and-restart')

        updateElectronApp({
          logger: log,
          notifyUser: false,
          updateInterval: isManualUpdate ? '5 minutes' : '10 minutes',
        })

        if (isManualUpdate) {
          autoUpdater.checkForUpdates()
        }

        autoUpdater.on('update-downloaded', async (_, __, releaseName) => {
          handleUpdateDownloaded({
            rootSpan,
            releaseName,
            isAutoUpdateEnabled,
            rootFinish,
          })
        })

        autoUpdater.on('checking-for-update', () =>
          handleUpdateChecking(rootSpan)
        )

        autoUpdater.on('update-available', () =>
          handleUpdateAvailable(rootSpan)
        )

        autoUpdater.on('update-not-available', () =>
          handleUpdateNotAvailable({ rootSpan, rootFinish })
        )

        autoUpdater.on('error', (message) =>
          handleUpdateError({ message, rootSpan, rootFinish })
        )

        ipcMain.handle('install-update-and-restart', async () =>
          installUpdateAndRestart()
        )

        rootSpan.setStatus({ code: 1 })
      } catch (error) {
        log.error('[update] error during initialization:', error)
        rootSpan.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
        rootFinish()

        throw error
      }
    }
  )
}

ipcMain.handle('is-update-in-progress', () => {
  log.debug(`[is-update-in-progress]: ${updateState}`)
  return updateState === 'installing'
})

export function resetUpdateState() {
  updateState = 'none'
}

export function resetAllUpdateState() {
  updateState = 'none'
  setQuittingState(false)
  setTearingDownState(false)
  pendingUpdateVersion = null
}

export function setAutoUpdateEnabled(enabled: boolean) {
  log.info(
    `[update] Auto update ${enabled ? 'enabled' : 'disabled'} dynamically`
  )

  store.set('isAutoUpdateEnabled', enabled)
  try {
    writeSetting('isAutoUpdateEnabled', String(enabled))
  } catch (err) {
    log.error('[DB] Failed to dual-write isAutoUpdateEnabled:', err)
  }

  if (!enabled) {
    // Reset update state when disabled
    updateState = 'none'
    pendingUpdateVersion = null

    // Remove all autoUpdater listeners to prevent further update activity
    autoUpdater.removeAllListeners()
    ipcMain.removeHandler('install-update-and-restart')
  } else {
    // Re-initialize auto-update when enabled
    if (!mainWindowGetter || !windowCreator) {
      log.error('[update] Cannot re-enable auto-update: references not found')
      return
    }

    initAutoUpdate({
      isManualUpdate: false,
      mainWindowGetter,
      windowCreator,
    })
  }
}

export function checkForUpdates() {
  if (updateState === 'none') {
    autoUpdater.checkForUpdates()
  }
}

export function getUpdateState() {
  return updateState
}

export function getIsAutoUpdateEnabled() {
  if (getFeatureFlag(featureFlagKeys.SQLITE_READS_SETTINGS)) {
    try {
      const value = readSetting('isAutoUpdateEnabled')
      if (value !== undefined) return value === 'true'
    } catch (err) {
      log.error('[DB] SQLite read failed, falling back to electron-store:', err)
    }
  }
  return store.get('isAutoUpdateEnabled')
}

export async function getLatestAvailableVersion() {
  const isAutoUpdateEnabled = store.get('isAutoUpdateEnabled')
  return Sentry.startSpanManual(
    {
      name: 'Check for latest version',
      op: 'update.get_latest_version',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        update_flow: 'true',
        current_version: getAppVersion(),
        update_state: updateState,
        toolhive_running: `${isToolhiveRunning()}`,
        is_auto_update_enabled: `${isAutoUpdateEnabled}`,
      },
    },
    async (span, finish) => {
      const currentVersion = getAppVersion()
      try {
        const { latestVersion, isNewVersionAvailable, currentVersion } =
          await fetchLatestRelease(span)

        return {
          currentVersion,
          latestVersion,
          isNewVersionAvailable,
        }
      } catch (error) {
        log.error('[update] Failed to check for ToolHive update: ', error)
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
        return {
          currentVersion: currentVersion,
          latestVersion: undefined,
          isNewVersionAvailable: false,
        }
      } finally {
        finish()
      }
    }
  )
}

export function manualUpdate() {
  const isAutoUpdateEnabled = store.get('isAutoUpdateEnabled')
  return Sentry.startSpanManual(
    {
      name: 'Manual update triggered',
      op: 'update.manual',
      attributes: {
        'analytics.source': 'tracking',
        'analytics.type': 'event',
        update_flow: 'true',
        is_manual_update: 'true',
        update_state: updateState,
        toolhive_running: `${isToolhiveRunning()}`,
        is_auto_update_enabled: `${isAutoUpdateEnabled}`,
      },
    },
    async (span, finish) => {
      try {
        if (!mainWindowGetter || !windowCreator) {
          log.error(
            '[update] Cannot perform manual update: initAutoUpdate was not called first'
          )
          span.setStatus({ code: 2, message: 'References not initialized' })
          finish()
          return
        }

        initAutoUpdate({
          isManualUpdate: true,
          mainWindowGetter,
          windowCreator,
        })
        span.setStatus({ code: 1 })
      } catch (error) {
        log.error('[update] error during manual update:', error)
        span.setStatus({
          code: 2,
          message:
            error instanceof Error
              ? error.message
              : `Unknown error during manual update ${JSON.stringify(error)}`,
        })
        throw error
      } finally {
        finish()
      }
    }
  )
}
