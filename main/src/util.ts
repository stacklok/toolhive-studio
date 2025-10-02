import { app, BrowserWindow } from 'electron'
import { existsSync, readFile } from 'node:fs'
import path from 'node:path'
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
    return /^\d+\.\d+\.\d+$/.test(version)
  } catch {
    log.error('Failed to get app version')
    return false
  }
}

export async function getInstanceId() {
  try {
    const userDataPath = app.getPath('userData')
    const updatesFilePath = path.join(userDataPath, 'updates.json')
    if (!existsSync(updatesFilePath)) {
      log.warn(`Updates file does not exist: ${updatesFilePath}`)
      return ''
    }

    const content = await new Promise<string>((resolve, reject) => {
      readFile(updatesFilePath, 'utf8', (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })

    const updatesData = JSON.parse(content)
    const instanceId = updatesData?.instance_id
    log.info(`Retrieved instance_id: ${instanceId}`)
    return instanceId
  } catch (error) {
    log.error('Failed to retrieve instance_id:', error)
    return ''
  }
}
