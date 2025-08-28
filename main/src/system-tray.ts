import { Menu, Tray, app, nativeImage, BrowserWindow } from 'electron'
import path from 'node:path'
import { getAutoLaunchStatus, setAutoLaunch } from './auto-launch'
import { createApplicationMenu } from './menu'
import log from './logger'
import { getAppVersion } from './util'
import { hideWindow, showWindow, showInDock } from './dock-utils'
import { showMainWindow, sendToMainWindowRenderer } from './mainWindow'

// Safe tray destruction with error handling
export function safeTrayDestroy(tray: Tray | null) {
  try {
    if (tray && !tray.isDestroyed()) {
      tray.destroy()
      log.info('[tray] Tray destroyed successfully')
    }
  } catch (error) {
    log.error('[tray] Failed to destroy tray: ', error)
    // Don't throw - this shouldn't block operations
  }
}

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

    // On Windows, there might be a small delay before the settings are reflected
    // Wait a bit before updating the UI to ensure we get the correct state
    if (process.platform === 'win32') {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

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
  label: 'Show Window',
  accelerator: 'CmdOrCtrl+S',
  type: 'normal' as const,
  click: withWindow(showWindowWithFocus),
})

const createHideMenuItem = () => ({
  label: 'Hide Window',
  accelerator: 'CmdOrCtrl+H',
  type: 'normal' as const,
  click: withWindow(hideWindow),
})

const createQuitMenuItem = () => ({
  label: 'Quit ToolHive',
  type: 'normal' as const,
  click: async () => {
    try {
      // Trigger the quit confirmation flow
      showInDock() // Ensure app is visible in dock
      await showMainWindow()
      sendToMainWindowRenderer('show-quit-confirmation')
    } catch (error) {
      log.error('Failed to show quit confirmation from tray:', error)
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

  const isRapidClick = (now: number) => now - lastClickTime < 300

  const toggleWindow = (window: BrowserWindow) => {
    setTimeout(() => {
      showWindowWithFocus(window)
    }, 50)
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
