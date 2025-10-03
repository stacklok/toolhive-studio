import { app, autoUpdater, dialog, ipcMain, type BrowserWindow } from 'electron'
import { updateElectronApp } from 'update-electron-app'
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
import {
  isCurrentVersionOlder,
  normalizeVersion,
} from '../../utils/parse-release-version'

export interface ReleaseAsset {
  name: string
  url: string
  size: number
  sha256: string
}

export interface ReleaseInfo {
  tag: string
  prerelease: boolean
  published_at: string
  base_url: string
  assets: ReleaseAsset[]
}

let pendingUpdateVersion: string | null = null
let updateState:
  | 'checking'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'none' = 'none'
let isAutoUpdateEnabled = false

/**
 * Gets all download assets for the current platform
 * @param releaseInfo - The release information from the API
 * @returns The tag of the release
 */
function getAssetForCurrentPlatform(
  releaseInfo: ReleaseInfo
): string | undefined {
  const platform = process.platform

  // Map platform to asset name patterns
  const assetPatterns: Record<string, string[]> = {
    darwin: ['darwin-arm64', 'darwin-x64'],
    win32: ['win32-x64', 'Setup.exe'],
    linux: ['linux-x64', 'amd64'],
  }

  const patterns = assetPatterns[platform]
  if (!patterns) {
    log.error(`[update] Unsupported platform: ${platform}`)
    return
  }

  const assets = releaseInfo.assets.filter((asset) => {
    const assetName = asset.name.toLowerCase()
    return patterns.some((pattern) => assetName.includes(pattern.toLowerCase()))
  })

  if (assets.length > 0) {
    return releaseInfo.tag
  } else {
    log.error(`[update] No assets found for patterns: ${patterns.join(', ')}`)
    return
  }
}

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

async function performUpdateInstallation(releaseName: string | null) {
  if (updateState === 'installing') {
    log.warn('[update] Update installation already in progress')
    return
  }

  log.info(`[update] installing update to version: ${releaseName || 'unknown'}`)
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
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('graceful-exit')
      // Give renderer time to handle the event
      await delay(500)
    }

    const shutdownSuccess = await safeServerShutdown()
    if (!shutdownSuccess) {
      log.warn('[update] Server shutdown failed, proceeding with update anyway')
    }

    try {
      stopToolhive()
      log.info('[update] ToolHive stopped')
    } catch (error) {
      log.error('[update] Error stopping ToolHive: ', error)
    }

    safeTrayDestroy()

    log.info('[update] all cleaned up, calling autoUpdater.quitAndInstall()...')
    autoUpdater.quitAndInstall()
  } catch (error) {
    log.error('[update] error during update installation:', error)
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

let getMainWindow: () => BrowserWindow | null = () => null
let createWindow: () => Promise<BrowserWindow> = () => {
  throw new Error('createWindow not initialized')
}

export function initAutoUpdate({
  isAutoUpdateEnabled: enabled,
  isManualUpdate = false,
  mainWindowGetter,
  windowCreator,
}: {
  isAutoUpdateEnabled: boolean
  isManualUpdate?: boolean
  mainWindowGetter: () => BrowserWindow | null
  windowCreator: () => Promise<BrowserWindow>
}) {
  getMainWindow = mainWindowGetter
  createWindow = windowCreator
  isAutoUpdateEnabled = enabled

  if (!isAutoUpdateEnabled && !isManualUpdate) {
    log.info('[update] Auto update is disabled, skipping initialization')
    return
  }

  resetAllUpdateState()

  updateElectronApp({ logger: log, notifyUser: false })

  autoUpdater.on('update-downloaded', async (_, __, releaseName) => {
    if (updateState === 'installing') {
      log.warn('[update] Update already in progress, ignoring duplicate event')
      return
    }

    log.info('[update] downloaded - showing dialog')
    pendingUpdateVersion = releaseName
    updateState = 'downloaded'

    try {
      let mainWindow = getMainWindow()

      // check if destroyed is important for not crashing the app
      if (!mainWindow || mainWindow.isDestroyed()) {
        log.warn(
          '[update] MainWindow not available, recreating for update dialog'
        )
        try {
          mainWindow = await createWindow()
          await pollWindowReady(mainWindow)
        } catch (error) {
          log.error(
            '[update] Failed to create window for update dialog: ',
            error
          )
          // Fallback: send notification to existing renderer if available
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-downloaded')
          }
          return
        }
      }

      if (mainWindow.isMinimized() && !mainWindow.isDestroyed()) {
        mainWindow.restore()
      }

      const dialogOpts = {
        type: 'info' as const,
        buttons: ['Restart', 'Later'],
        cancelId: 1,
        defaultId: 0,
        title: `Release ${releaseName}`,
        message:
          process.platform === 'darwin'
            ? `Release ${releaseName}`
            : 'A new version has been downloaded.\nRestart the application to apply the updates.',
        detail:
          process.platform === 'darwin'
            ? 'A new version has been downloaded.\nRestart the application to apply the updates.'
            : `Ready to install ${releaseName}`,
        icon: undefined,
      }

      const returnValue = await dialog.showMessageBox(mainWindow, dialogOpts)

      if (returnValue.response === 0) {
        await performUpdateInstallation(releaseName)
      } else {
        updateState = 'none'
        log.info(
          '[update] user deferred update installation - showing toast notification'
        )
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-downloaded')
        }
      }
    } catch (error) {
      log.error('[update] error in update-downloaded handler:', error)
      updateState = 'none'
      // Fallback: send notification to renderer
      const mainWindow = getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-downloaded')
      }
    }
  })

  autoUpdater.on('checking-for-update', () => {
    log.info('[update] checking for updates...')
    updateState = 'checking'
  })

  autoUpdater.on('update-available', () => {
    updateState = 'downloading'
  })

  autoUpdater.on('update-not-available', () => {
    if (updateState === 'downloading') {
      log.warn('[update] update became unavailable during download - ignoring')
      return
    }
    updateState = 'none'
  })

  autoUpdater.on('error', (message) => {
    log.error(
      '[update] there was a problem updating the application: ',
      message
    )
    log.info('[update] update state: ', updateState)
    log.info('[update] toolhive binary is running: ', isToolhiveRunning())
    updateState = 'none'
  })

  ipcMain.handle('install-update-and-restart', async () => {
    if (updateState === 'installing') {
      log.warn('[update] Update installation already in progress via IPC')
      return { success: false, error: 'Update already in progress' }
    }

    log.info(
      `[update] installing update and restarting application via IPC ${pendingUpdateVersion || 'unknown'}`
    )

    try {
      await performUpdateInstallation(pendingUpdateVersion)
      return { success: true }
    } catch (error) {
      log.error('[update] IPC update installation failed: ', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
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
  isAutoUpdateEnabled = enabled

  if (!enabled) {
    // Reset update state when disabled
    updateState = 'none'
    pendingUpdateVersion = null
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

export async function getLatestAvailableVersion() {
  try {
    const response = await fetch(
      'https://stacklok.github.io/toolhive-studio/latest',
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    if (!response.ok) {
      log.error(
        '[update] Failed to check for ToolHive update: ',
        response.statusText
      )
      return
    }
    const data = await response.json()
    const latestTag = getAssetForCurrentPlatform(data)

    return {
      currentVersion: getAppVersion(),
      latestVersion: latestTag,
      isNewVersionAvailable: isCurrentVersionOlder(
        getAppVersion(),
        normalizeVersion(latestTag ?? '')
      ),
    }
  } catch (error) {
    log.error('[update] Failed to check for ToolHive update: ', error)
    return
  }
}
