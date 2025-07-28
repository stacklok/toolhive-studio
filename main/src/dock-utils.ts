import { app, BrowserWindow } from 'electron'
import log from './logger'

const hideFromDock = () => {
  if (process.platform === 'darwin' && app.dock) {
    try {
      app.dock.hide()
    } catch (error) {
      log.error('Failed to hide from dock: ', error)
    }
  }
}

export const showInDock = () => {
  if (process.platform === 'darwin' && app.dock) {
    try {
      app.dock.show()
    } catch (error) {
      log.error('Failed to show in dock: ', error)
    }
  }
}

export const hideWindow = (window: BrowserWindow) => {
  window.hide()
  hideFromDock()
}

export const showWindow = (window: BrowserWindow) => {
  if (window.isMinimized()) window.restore()
  showInDock()
  window.show()
  window.focus()
}
