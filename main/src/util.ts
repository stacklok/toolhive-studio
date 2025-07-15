import { app, BrowserWindow } from 'electron'
import log from './logger'
import { delay } from '../../utils/delay'

export function getAppVersion(): string {
  if (process.env.SENTRY_RELEASE) {
    return process.env.SENTRY_RELEASE
  }
  return app.getVersion()
}

export async function pollWindowReady(window: BrowserWindow): Promise<void> {
  if (window?.isVisible() && !window.webContents.isLoading()) {
    log.info('Window is ready and visible')
    return
  }

  log.info('Window not ready yet, waiting...')
  await delay(100)
  return pollWindowReady(window)
}

export function isOfficialReleaseBuild(): boolean {
  try {
    const version = getAppVersion()
    console.log('version', version)
    return /^\d+\.\d+\.\d+$/.test(version)
  } catch {
    log.error('Failed to get app version')
    return false
  }
}
