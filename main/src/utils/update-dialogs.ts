import { dialog, shell } from 'electron'
import log from '../logger'
import { getAppVersion } from '../util'
import { getLatestAvailableVersion, manualUpdate } from '../auto-update'

/**
 * Check for updates and show appropriate dialogs to the user
 * Returns true if an update was started, false otherwise
 */
export async function handleCheckForUpdates(): Promise<boolean> {
  try {
    const appVersionInfo = await getLatestAvailableVersion()
    const currentVersion = getAppVersion()

    if (appVersionInfo.isNewVersionAvailable && appVersionInfo.latestVersion) {
      // Update available
      const response = await dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `New Version Available: ${appVersionInfo.latestVersion}`,
        detail: `You are currently using version ${currentVersion}.\n\nA new version is available. Would you like to download it now?`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })

      if (response.response === 0) {
        const isLinux = process.platform === 'linux'
        if (isLinux) {
          shell.openExternal(
            'https://github.com/stacklok/toolhive-studio/releases/latest'
          )
          return true
        }
        log.info(
          '[update] Starting manual update to version:',
          appVersionInfo.latestVersion
        )
        manualUpdate()
        return true
      }
      return false
    } else {
      // Already up to date
      await dialog.showMessageBox({
        type: 'info',
        title: 'No Update Available',
        message: 'You are already using the latest version.',
        detail: `Current version: ${currentVersion}\n\nYou have the latest version of ToolHive installed.`,
        buttons: ['OK'],
        defaultId: 0,
      })

      log.info('[update] Already on the latest version')
      return false
    }
  } catch (error) {
    log.error('[update] Failed to check for updates:', error)

    await dialog.showMessageBox({
      type: 'error',
      title: 'Update Check Failed',
      message: 'Failed to check for updates',
      detail: 'Please check your internet connection and try again later.',
      buttons: ['OK'],
      defaultId: 0,
    })
    return false
  }
}
