import { app, BrowserWindow } from 'electron'
import { execSync } from 'node:child_process'
import log from './logger'
import { delay } from '../../utils/delay'

function getVersionFromGit(): string {
  try {
    const exactTag = execSync('git describe --exact-match --tags HEAD', {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim()
    return exactTag.replace(/^v/, '')
  } catch {
    try {
      const describe = execSync('git describe --tags --always', {
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim()

      const version = describe.replace(/^v/, '').split('-')[0]
      return version ?? app.getVersion()
    } catch {
      return app.getVersion()
    }
  }
}

export function getAppVersion(): string {
  if (process.env.SENTRY_RELEASE) {
    return process.env.SENTRY_RELEASE
  }
  return getVersionFromGit()
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
