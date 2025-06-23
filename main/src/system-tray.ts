import {
  Menu,
  Tray,
  app,
  nativeImage,
  nativeTheme,
  BrowserWindow,
} from 'electron'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { blockQuit } from './main'
import { getAutoLaunchStatus, setAutoLaunch } from './auto-launch'

const getIconBasePath = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'icons')
    : path.join(__dirname, '..', '..', 'icons')

const getIconName = (isDarkMode: boolean) => {
  if (process.platform === 'win32') return 'icon.ico'
  return isDarkMode ? 'tray-icon-dark.png' : 'tray-icon.png'
}

const getFallbackIconName = () =>
  process.platform === 'win32' ? 'icon.ico' : 'icon.png'

const createIconPath = (iconName: string) =>
  path.join(getIconBasePath(), iconName)

const resolveIconPath = () => {
  const isDarkMode = nativeTheme.shouldUseDarkColors
  const preferredPath = createIconPath(getIconName(isDarkMode))

  if (existsSync(preferredPath)) {
    return preferredPath
  }

  console.warn(
    `Preferred tray icon not found at: ${preferredPath}, trying fallback`
  )
  const fallbackPath = createIconPath(getFallbackIconName())

  if (!existsSync(fallbackPath)) {
    throw new Error(`No suitable icon found at ${fallbackPath}`)
  }

  return fallbackPath
}

const createTrayImage = (iconPath: string) => {
  console.log(`Using tray icon: ${iconPath}`)
  const image = nativeImage.createFromPath(iconPath)

  if (image.isEmpty()) {
    throw new Error(`Failed to create image from path: ${iconPath}`)
  }

  return process.platform === 'win32'
    ? image.resize({ width: 16, height: 16 })
    : image
}

const createTrayWithSetup =
  (setupFn: (tray: Tray, toolHiveIsRunning: boolean) => void) =>
  (toolHiveIsRunning: boolean) => {
    try {
      const iconPath = resolveIconPath()
      const image = createTrayImage(iconPath)
      const tray = new Tray(image)

      setupFn(tray, toolHiveIsRunning)
      return tray
    } catch (error) {
      console.error('Failed to create tray:', error)
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
    console.log(`Auto-launch ${!currentStatus ? 'enabled' : 'disabled'}`)

    // Update the tray menu to reflect the new state
    setupTrayMenu(currentTray, toolHiveIsRunning)
  } catch (error) {
    console.error('Failed to toggle auto-launch:', error)
  }
}

const createStatusMenuItem = (toolHiveIsRunning: boolean) => ({
  label: toolHiveIsRunning
    ? '🟢 ToolHive is running'
    : '🔴 ToolHive is stopped',
  type: 'normal' as const,
  enabled: false,
})

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
    withWindow(showWindowWithFocus)()
    blockQuit('system-tray')
  },
})

const createSeparator = () => ({ type: 'separator' as const })

const createMenuTemplate = (currentTray: Tray, toolHiveIsRunning: boolean) => [
  createStatusMenuItem(toolHiveIsRunning),
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

  tray.setToolTip('ToolHive Studio')
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
    console.error('Failed to update tray status:', error)
  }
}
