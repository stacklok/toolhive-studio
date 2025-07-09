import { app, BrowserWindow } from 'electron'
import { execSync } from 'node:child_process'
import log from './logger'

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
  return new Promise((resolve) => {
    const checkReady = () => {
      if (window?.isVisible() && window.webContents.isLoading() === false) {
        log.info('Window is ready and visible')
        resolve(void 0)
      } else {
        log.info('Window not ready yet, waiting...')
        setTimeout(checkReady, 100)
      }
    }
    checkReady()
  })
}
