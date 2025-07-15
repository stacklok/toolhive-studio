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
    log.info('version try', exactTag.replace(/^v/, ''))
    return exactTag.replace(/^v/, '')
  } catch {
    try {
      const describe = execSync('git describe --tags --always', {
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim()

      const version = describe.replace(/^v/, '').split('-')[0]
      log.info('version -', version)
      log.info('app.getVersion -', app.getVersion())
      return version ?? app.getVersion()
    } catch {
      log.info('app.getVersion catch', app.getVersion())
      return app.getVersion()
    }
  }
}

export function getAppVersion(): string {
  if (process.env.SENTRY_RELEASE) {
    return process.env.SENTRY_RELEASE
  }
  log.info('isReleaseBuild', !!process.env.SENTRY_RELEASE)
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
