import { Menu, Tray, app, nativeImage, BrowserWindow } from 'electron'
import path from 'node:path'
import { getAutoLaunchStatus, setAutoLaunch } from './auto-launch'
import { createApplicationMenu } from './menu'
import log from './logger'
import { getAppVersion } from './util'

///////////////////////////////////////////////////
// Tray icon
///////////////////////////////////////////////////

function getIcon(): Electron.NativeImage {
  const basePath: string = app.isPackaged
    ? path.join(process.resourcesPath, 'icons')
    : path.join(__dirname, '..', '..', 'icons')

  switch (process.platform) {
    case 'darwin': {
      const image = nativeImage.createFromPath(
        path.join(basePath, 'tray-icon.png')
      )
      // adapt between light/dark modes
      image.setTemplateImage(true)
      return image
    }
    case 'win32': {
      const image = nativeImage.createFromPath(path.join(basePath, 'icon.ico'))
      return image.resize({ width: 16, height: 16 })
    }
    case 'linux': {
      const image = nativeImage.createFromPath(
        path.join(basePath, 'tray-icon-dark.png')
      )
      return image
    }
    default: {
      const image = nativeImage.createFromPath(
        path.join(basePath, 'tray-icon.png')
      )
      return image
    }
  }
}

///////////////////////////////////////////////////
// Tray icon & menu
///////////////////////////////////////////////////

const createTrayWithSetup =
  (setupFn: (tray: Tray, toolHiveIsRunning: boolean) => void) =>
  (toolHiveIsRunning: boolean) => {
    try {
      const tray = new Tray(getIcon())

      setupFn(tray, toolHiveIsRunning)
      return tray
    } catch (error) {
      log.error('Failed to create tray: ', error)
      throw error
    }
  }

export const initTray = ({
  toolHiveIsRunning,
}: {
  toolHiveIsRunning: boolean
}) => createTrayWithSetup(setupTrayMenu)(toolHiveIsRunning)

const getMainWindow = () => BrowserWindow.getAllWindows()[0]

const withWindow = (operation: (window: BrowserWindow) => void) => () => {
  const window = getMainWindow()
  if (window) operation(window)
}

const restoreWindow = (window: BrowserWindow) => {
  if (window.isMinimized()) window.restore()
}

const showWindow = (window: BrowserWindow) => {
  restoreWindow(window)
  window.show()
  window.focus()
}

const hideWindow = (window: BrowserWindow) => {
  window.hide()
}

// Windows-specific bring-to-front behavior
const bringToFrontOnWindows = (window: BrowserWindow) => {
  if (process.platform !== 'win32') return

  // Use setTimeout to separate setAlwaysOnTop calls across event loop ticks
  // This gives Windows time to process each command, preventing flickering
  setTimeout(() => {
    if (!window.isDestroyed()) {
      window.setAlwaysOnTop(true)
      setTimeout(() => {
        if (!window.isDestroyed()) {
          window.setAlwaysOnTop(false)
        }
      }, 10)
    }
  }, 10)
}

const showWindowWithFocus = (window: BrowserWindow) => {
  showWindow(window)
  bringToFrontOnWindows(window)
}

const handleStartOnLogin = async (
  currentTray: Tray,
  toolHiveIsRunning: boolean
) => {
  const currentStatus = getAutoLaunchStatus()

  try {
    setAutoLaunch(!currentStatus)

    // Update the tray menu to reflect the new state
    setupTrayMenu(currentTray, toolHiveIsRunning)

    // Update the application menu to reflect the new state
    createApplicationMenu(currentTray)
  } catch (error) {
    log.error('Failed to toggle auto-launch: ', error)
  }
}

const createStatusMenuItem = (toolHiveIsRunning: boolean) => ({
  label: toolHiveIsRunning
    ? '🟢 ToolHive is running'
    : '🔴 ToolHive is stopped',
  type: 'normal' as const,
  enabled: false,
})

const getCurrentAppVersion = () => {
  const appVersion = getAppVersion()
  return {
    label: `Current version: v${appVersion}`,
    type: 'normal' as const,
    enabled: false,
  }
}

const startOnLoginMenu = (currentTray: Tray, toolHiveIsRunning: boolean) => {
  const isStartOnLogin = getAutoLaunchStatus()
  return {
    label: 'Start on login',
    checked: isStartOnLogin,
    accelerator: 'CmdOrCtrl+L',
    type: 'checkbox' as const,
    click: () => handleStartOnLogin(currentTray, toolHiveIsRunning),
  }
}

const createShowMenuItem = () => ({
  label: 'Show App',
  accelerator: 'CmdOrCtrl+S',
  type: 'normal' as const,
  click: withWindow(showWindowWithFocus),
})

const createHideMenuItem = () => ({
  label: 'Hide App',
  accelerator: 'CmdOrCtrl+H',
  type: 'normal' as const,
  click: withWindow(hideWindow),
})

const createQuitMenuItem = () => ({
  label: 'Quit App',
  accelerator: 'CmdOrCtrl+Q',
  type: 'normal' as const,
  click: () => {
    // Get the main window and trigger the confirmation flow
    const window = BrowserWindow.getAllWindows()[0]
    if (window) {
      window.show()
      window.focus()
      window.webContents.send('show-quit-confirmation')
    }
  },
})

const createSeparator = () => ({ type: 'separator' as const })

const createMenuTemplate = (currentTray: Tray, toolHiveIsRunning: boolean) => [
  createStatusMenuItem(toolHiveIsRunning),
  getCurrentAppVersion(),
  createSeparator(),
  startOnLoginMenu(currentTray, toolHiveIsRunning),
  createSeparator(),
  createShowMenuItem(),
  createHideMenuItem(),
  createSeparator(),
  createQuitMenuItem(),
]

const createClickHandler = () => {
  let lastClickTime = 0
  let lastWindowState = false

  const isRapidClick = (now: number) => now - lastClickTime < 300

  const toggleWindow = (window: BrowserWindow) => {
    setTimeout(() => {
      log.info('TOGGLE WIN: ', {
        winIsVisible: window.isVisible(),
        winIsMinimized: window.isMinimized(),
        check: window.isVisible() && !window.isMinimized(),
        lastWindowState,
      })
    }, 100)

    if (lastWindowState) {
      hideWindow(window)
      lastWindowState = false
    } else {
      showWindowWithFocus(window)
      lastWindowState = true
    }
  }

  return () => {
    const now = Date.now()

    if (isRapidClick(now)) {
      return
    }

    const window = getMainWindow()
    if (window) {
      toggleWindow(window)
      lastClickTime = now
    }
  }
}

function setupTrayMenu(tray: Tray, toolHiveIsRunning: boolean) {
  const menuTemplate = createMenuTemplate(tray, toolHiveIsRunning)
  const contextMenu = Menu.buildFromTemplate(menuTemplate)

  tray.setToolTip('ToolHive')
  tray.setContextMenu(contextMenu)

  // Windows-specific click handling
  if (process.platform === 'win32') {
    tray.on('click', createClickHandler())
  }
}

// Function to update tray status without recreating the entire tray
export const updateTrayStatus = (tray: Tray, toolHiveIsRunning: boolean) => {
  if (!tray || tray.isDestroyed()) return

  try {
    setupTrayMenu(tray, toolHiveIsRunning)
  } catch (error) {
    log.error('Failed to update tray status: ', error)
  }
}
