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

export const initTray = ({
  toolHiveIsRunning,
}: {
  toolHiveIsRunning: boolean
}) => {
  const getIconPath = () => {
    const isDarkMode = nativeTheme.shouldUseDarkColors

    // On Windows, prefer .ico files for better system integration
    if (process.platform === 'win32') {
      const iconName = 'icon.ico'
      if (app.isPackaged) {
        return path.join(process.resourcesPath, 'icons', iconName)
      }
      return path.join(__dirname, '..', '..', 'icons', iconName)
    }

    // For other platforms, use PNG files with theme support
    const iconName = isDarkMode ? 'tray-icon-dark.png' : 'tray-icon.png'
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'icons', iconName)
    }
    return path.join(__dirname, '..', '..', 'icons', iconName)
  }

  const getFallbackIconPath = () => {
    // Fallback to a generic icon if theme-specific ones don't exist
    const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'icons', iconName)
    }
    return path.join(__dirname, '..', '..', 'icons', iconName)
  }

  try {
    let iconPath = getIconPath()

    // If the preferred icon doesn't exist, try fallback
    if (!existsSync(iconPath)) {
      console.warn(
        `Preferred tray icon not found at: ${iconPath}, trying fallback`
      )
      iconPath = getFallbackIconPath()
    }

    if (!existsSync(iconPath)) {
      console.error(`Tray icon file not found at: ${iconPath}`)
      throw new Error(`No suitable icon found at ${iconPath}`)
    }

    console.log(`Using tray icon: ${iconPath}`)
    const image = nativeImage.createFromPath(iconPath)

    // Verify the image was created successfully
    if (image.isEmpty()) {
      throw new Error(`Failed to create image from path: ${iconPath}`)
    }

    // On Windows, resize the icon to ensure proper display
    if (process.platform === 'win32') {
      // Windows system tray typically uses 16x16 icons
      const resizedImage = image.resize({ width: 16, height: 16 })
      const tray = new Tray(resizedImage)
      setupTrayMenu(tray, toolHiveIsRunning)
      return tray
    } else {
      const tray = new Tray(image)
      setupTrayMenu(tray, toolHiveIsRunning)
      return tray
    }
  } catch (error) {
    console.error('Failed to create tray:', error)
    throw error
  }
}

// Function to update tray status without recreating the entire tray
export const updateTrayStatus = (tray: Tray, toolHiveIsRunning: boolean) => {
  if (!tray || tray.isDestroyed()) {
    return
  }

  try {
    setupTrayMenu(tray, toolHiveIsRunning)
  } catch (error) {
    console.error('Failed to update tray status:', error)
  }
}

function setupTrayMenu(tray: Tray, toolHiveIsRunning: boolean) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: toolHiveIsRunning
        ? '🟢 ToolHive is running'
        : '🔴 ToolHive is stopped',
      type: 'normal',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show App',
      type: 'normal',
      click: () => {
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore()
          }
          mainWindow.show()
          mainWindow.focus()
          // On Windows, bring window to front
          if (process.platform === 'win32') {
            mainWindow.setAlwaysOnTop(true)
            mainWindow.setAlwaysOnTop(false)
          }
        }
      },
    },
    {
      label: 'Hide App',
      type: 'normal',
      click: () => {
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (mainWindow) {
          mainWindow.hide()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit App',
      type: 'normal',
      click: () => {
        app.quit()
      },
    },
  ])

  // Set tooltip
  tray.setToolTip('ToolHive Studio')
  tray.setContextMenu(contextMenu)

  // On Windows, handle single click to show/hide window
  if (process.platform === 'win32') {
    tray.on('click', () => {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
          mainWindow.hide()
        } else {
          if (mainWindow.isMinimized()) {
            mainWindow.restore()
          }
          mainWindow.show()
          mainWindow.focus()
          mainWindow.setAlwaysOnTop(true)
          mainWindow.setAlwaysOnTop(false)
        }
      }
    })
  }
}
