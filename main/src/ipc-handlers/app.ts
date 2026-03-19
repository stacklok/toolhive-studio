import { app, ipcMain } from 'electron'
import { existsSync, readFile } from 'node:fs'
import path from 'node:path'
import { blockQuit } from '../app-events'
import { setAutoLaunch, getAutoLaunchStatus } from '../auto-launch'
import { showInDock } from '../dock-utils'
import log from '../logger'
import { showMainWindow, hideMainWindow } from '../main-window'
import { createApplicationMenu } from '../menu'
import {
  getSkipQuitConfirmation,
  setSkipQuitConfirmation,
} from '../quit-confirmation'
import {
  getNewsletterState,
  setNewsletterSubscribed,
  setNewsletterDismissedAt,
} from '../newsletter'
import {
  getExpertConsultationState,
  setExpertConsultationSubmitted,
  setExpertConsultationDismissedAt,
} from '../expert-consultation'
import { updateTrayStatus } from '../system-tray'
import { isToolhiveRunning } from '../toolhive-manager'

export function register() {
  ipcMain.handle('get-auto-launch-status', () => getAutoLaunchStatus())

  ipcMain.handle('set-auto-launch', (_event, enabled: boolean) => {
    setAutoLaunch(enabled)
    updateTrayStatus(isToolhiveRunning())
    createApplicationMenu()
    return getAutoLaunchStatus()
  })

  ipcMain.handle('show-app', async () => {
    try {
      showInDock()
      await showMainWindow()
    } catch (error) {
      log.error('Failed to show app:', error)
    }
  })

  ipcMain.handle('hide-app', () => {
    try {
      hideMainWindow()
    } catch (error) {
      log.error('Failed to hide app:', error)
    }
  })

  ipcMain.handle('quit-app', () => {
    blockQuit('before-quit')
  })

  ipcMain.handle('get-skip-quit-confirmation', () => getSkipQuitConfirmation())
  ipcMain.handle('set-skip-quit-confirmation', (_e, skip: boolean) =>
    setSkipQuitConfirmation(skip)
  )

  ipcMain.handle('get-newsletter-state', () => getNewsletterState())
  ipcMain.handle('set-newsletter-subscribed', (_e, subscribed: boolean) =>
    setNewsletterSubscribed(subscribed)
  )
  ipcMain.handle('set-newsletter-dismissed-at', (_e, dismissedAt: string) =>
    setNewsletterDismissedAt(dismissedAt)
  )

  ipcMain.handle('get-expert-consultation-state', () =>
    getExpertConsultationState()
  )
  ipcMain.handle(
    'set-expert-consultation-submitted',
    (_e, submitted: boolean) => setExpertConsultationSubmitted(submitted)
  )
  ipcMain.handle(
    'set-expert-consultation-dismissed-at',
    (_e, dismissedAt: string) => setExpertConsultationDismissedAt(dismissedAt)
  )

  ipcMain.handle(
    'get-main-log-content',
    async (): Promise<string | undefined> => {
      try {
        const logPath = path.join(app.getPath('logs'), 'main.log')
        if (!existsSync(logPath)) {
          log.warn(`Log file does not exist: ${logPath}`)
          return
        }

        const content = await new Promise<string>((resolve, reject) => {
          readFile(logPath, 'utf8', (err, data) => {
            if (err) reject(err)
            else resolve(data)
          })
        })

        return content
      } catch (error) {
        log.error('Failed to read log file:', error)
        return
      }
    }
  )
}
