import log from 'electron-log/renderer'

/**
 * Checks whether the Electron auto-updater is currently applying an update.
 * When true the caller should skip all health/API checks because the backend
 * is restarting and temporarily unreachable.
 * Returns false if the IPC call is unavailable (e.g. dev mode without Electron).
 */
export async function checkUpdateInProgress(): Promise<boolean> {
  try {
    const inProgress = await window.electronAPI.isUpdateInProgress()
    if (inProgress) {
      log.info('[beforeLoad] Skipping health API check - update in progress')
    }
    return inProgress
  } catch (e) {
    log.debug(`[beforeLoad] Update check API not available: ${e}`)
    return false
  }
}
