import {
  app,
  BrowserWindow,
  Tray,
  ipcMain,
  nativeTheme,
  session,
} from 'electron'
import path from 'node:path'
import { existsSync } from 'node:fs'
import started from 'electron-squirrel-startup'
import { spawn } from 'node:child_process'
import * as Sentry from '@sentry/electron/main'
import { initTray, updateTrayStatus } from './system-tray'
import { setAutoLaunch, getAutoLaunchStatus } from './auto-launch'
import net from 'node:net'
import { getCspString } from './csp'

// Sentry setup
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
})

// Forge environment variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined
declare const MAIN_WINDOW_VITE_NAME: string

// Determine the binary path for both dev and prod
const binName = process.platform === 'win32' ? 'thv.exe' : 'thv'
const binPath = app.isPackaged
  ? path.join(
      process.resourcesPath,
      'bin',
      `${process.platform}-${process.arch}`,
      binName
    )
  : path.resolve(
      __dirname,
      '..',
      '..',
      'bin',
      `${process.platform}-${process.arch}`,
      binName
    )

console.log(`ToolHive binary path: ${binPath}`)
console.log(`Binary file exists: ${existsSync(binPath)}`)

// For cleaning up
let toolhiveProcess: ReturnType<typeof spawn> | undefined
let tray: Tray | null = null
let toolhivePort: number | undefined
let isQuitting = false

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, () => {
      const address = server.address()
      if (typeof address === 'object' && address && address.port) {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        reject(new Error('Failed to get port'))
      }
    })
    server.on('error', reject)
  })
}

async function startToolhive() {
  if (!existsSync(binPath)) {
    console.error(`ToolHive binary not found at: ${binPath}`)
    return
  }
  toolhivePort = await findFreePort()
  console.log(`Starting ToolHive from: ${binPath} on port ${toolhivePort}`)
  toolhiveProcess = spawn(
    binPath,
    ['serve', '--openapi', `--port=${toolhivePort}`],
    {
      stdio: 'ignore',
      detached: true,
    }
  )
  toolhiveProcess.on('error', (error) => {
    console.error('Failed to start ToolHive:', error)
    // Update tray to show ToolHive is not running
    if (tray) {
      updateTrayStatus(tray, false)
    }
  })
  toolhiveProcess.on('exit', (code) => {
    console.log(`ToolHive process exited with code: ${code}`)
    toolhiveProcess = undefined
    // Update tray to show ToolHive is not running
    if (tray) {
      updateTrayStatus(tray, false)
    }
  })
  toolhiveProcess.unref()

  // Update tray to show ToolHive is running
  if (tray) {
    updateTrayStatus(tray, true)
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

// Check if app should start hidden
const shouldStartHidden =
  process.argv.includes('--hidden') || process.argv.includes('--start-hidden')
const isDevelopment = process.env.NODE_ENV === 'development'
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1040,
    height: 700,
    show: !shouldStartHidden, // Don't show window if starting hidden
    autoHideMenuBar: true, // Hide the menu bar
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDevelopment,
    },
  })

  // On Windows, handle minimize to tray behavior
  if (process.platform === 'win32') {
    mainWindow.on('minimize', () => {
      if (shouldStartHidden || tray) {
        mainWindow.hide()
      }
    })

    mainWindow.on('close', (event) => {
      if (!isQuitting && tray) {
        event.preventDefault()
        mainWindow.hide()
      }
    })
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/`)
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }

  return mainWindow
}

let mainWindow: BrowserWindow | null = null

app.on('ready', () => {
  startToolhive()
  mainWindow = createWindow()
})

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (isDevelopment) {
      return callback({ responseHeaders: details.responseHeaders })
    }
    if (toolhivePort == null) {
      throw new Error('[content-security-policy] ToolHive port is not set')
    }
    return callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [getCspString(toolhivePort)],
      },
    })
  })

  try {
    tray = initTray({
      toolHiveIsRunning: !!toolhiveProcess,
    })
    console.log('System tray initialized successfully')
  } catch (error) {
    console.error('Failed to initialize system tray:', error)
    // Continue without tray - the app should still work
  }

  // Update tray when theme changes (for non-Windows platforms that use themed icons)
  nativeTheme.on('updated', () => {
    if (tray && process.platform !== 'win32') {
      try {
        tray.destroy()
        tray = initTray({
          toolHiveIsRunning: !!toolhiveProcess,
        })
      } catch (error) {
        console.error('Failed to update tray after theme change:', error)
      }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createWindow()
  } else if (mainWindow) {
    mainWindow.show()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  if (toolhiveProcess && !toolhiveProcess.killed) {
    toolhiveProcess.kill()
  }
  if (tray) {
    tray.destroy()
  }
})

// IPC handlers for theme management
ipcMain.handle('dark-mode:toggle', () => {
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = 'light'
  } else {
    nativeTheme.themeSource = 'dark'
  }
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('dark-mode:system', () => {
  nativeTheme.themeSource = 'system'
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle(
  'dark-mode:set',
  (_event, theme: 'light' | 'dark' | 'system') => {
    nativeTheme.themeSource = theme
    return nativeTheme.shouldUseDarkColors
  }
)

ipcMain.handle('dark-mode:get', () => {
  return {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource,
  }
})

// IPC handlers for auto-launch management
ipcMain.handle('get-auto-launch-status', () => {
  return getAutoLaunchStatus()
})

ipcMain.handle('set-auto-launch', (_event, enabled: boolean) => {
  setAutoLaunch(enabled)
  return getAutoLaunchStatus() // Return the new status
})

// IPC handlers for app control
ipcMain.handle('show-app', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})

ipcMain.handle('hide-app', () => {
  if (mainWindow) {
    mainWindow.hide()
  }
})

ipcMain.handle('quit-app', () => {
  app.quit()
})

ipcMain.handle('get-toolhive-port', () => {
  return toolhivePort
})
