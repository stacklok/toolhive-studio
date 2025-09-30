import { BrowserWindow, shell } from 'electron'
import path from 'node:path'
import log from './logger'
import { hideWindow } from './dock-utils'
import { getQuittingState, getTray } from './app-state'
import { pollWindowReady } from './util'

// Forge environment variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined
declare const MAIN_WINDOW_VITE_NAME: string

const DEFAULT_WINDOW_WIDTH = 1280
const DEFAULT_WINDOW_HEIGHT = 800
const TRAFFIC_LIGHT_POSITION = { x: 21, y: 24 }

interface WindowOptions {
  width?: number
  height?: number
  show?: boolean
}

interface PlatformWindowConfig {
  titleBarStyle?: 'hidden'
  trafficLightPosition?: { x: number; y: number }
  frame?: boolean
}

// Error logging helper
function logError(
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const logContext = context ? ` Context: ${JSON.stringify(context)}` : ''
  log.error(`${operation}: ${errorMessage}${logContext}`)
}

// Module state
let mainWindow: BrowserWindow | null = null
const shouldStartHidden =
  process.argv.includes('--hidden') || process.argv.includes('--start-hidden')
const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Get platform-specific window configuration
 */
function getPlatformSpecificWindowOptions(): PlatformWindowConfig {
  const platformConfigs: Record<string, PlatformWindowConfig> = {
    darwin: {
      titleBarStyle: 'hidden',
      trafficLightPosition: TRAFFIC_LIGHT_POSITION,
    },
    win32: {
      frame: false, // Completely frameless for custom window controls
    },
    linux: {
      frame: false, // Frameless for custom controls
    },
  }

  return (platformConfigs[process.platform] ||
    platformConfigs.linux) as PlatformWindowConfig
}

/**
 * Load window content based on environment
 */
async function loadWindowContent(window: BrowserWindow): Promise<void> {
  try {
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      await window.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/`)
      log.info('Loaded development server URL')
    } else {
      const filePath = path.join(
        __dirname,
        `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
      )
      await window.loadFile(filePath)
      log.info('Loaded production HTML file')
    }
  } catch (error) {
    logError('Failed to load window content', error)
    throw error
  }
}

/**
 * Setup window event handlers
 */
function setupWindowEventHandlers(window: BrowserWindow): void {
  try {
    // Minimize-to-tray instead of close
    window.on('minimize', () => {
      try {
        if (shouldStartHidden || getTray()) {
          hideWindow(window)
        }
      } catch (error) {
        log.error('Error handling window minimize:', error)
      }
    })

    // Handle window close
    window.on('close', (event) => {
      try {
        if (!getQuittingState() && getTray()) {
          event.preventDefault()
          hideWindow(window)
        }
      } catch (error) {
        log.error('Error handling window close:', error)
      }
    })

    // External links → default browser
    window.webContents.setWindowOpenHandler(({ url }) => {
      try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          shell.openExternal(url)
          return { action: 'deny' }
        }
        return { action: 'allow' }
      } catch (error) {
        log.error('Error handling window open:', error)
        return { action: 'deny' }
      }
    })

    log.info('Window event handlers setup successfully')
  } catch (error) {
    log.error('Failed to setup window event handlers:', error)
  }
}

/**
 * Get the current main window instance
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/**
 * Check if the main window exists and is not destroyed
 */
export function isMainWindowValid(): boolean {
  return mainWindow !== null && !mainWindow.isDestroyed()
}

/**
 * Create a new main window
 */
export async function createMainWindow(
  options: WindowOptions = {}
): Promise<BrowserWindow> {
  try {
    log.info('Creating main window...')

    const windowOptions = {
      width: options.width || DEFAULT_WINDOW_WIDTH,
      height: options.height || DEFAULT_WINDOW_HEIGHT,
      show: options.show ?? !shouldStartHidden,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: !isDevelopment,
      },
      ...getPlatformSpecificWindowOptions(),
    }

    mainWindow = new BrowserWindow(windowOptions)

    // Setup window event handlers
    setupWindowEventHandlers(mainWindow)

    // Load the appropriate content
    await loadWindowContent(mainWindow)

    // Setup developer tools in development
    if (isDevelopment && import.meta.env.VITE_ENABLE_AUTO_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools()
    }

    log.info('Main window created successfully')
    return mainWindow
  } catch (error) {
    logError('Failed to create main window', error)
    throw error
  }
}

/**
 * Focus and show existing window (without creating new one)
 */
export function focusMainWindow(): void {
  try {
    if (!isMainWindowValid()) {
      log.warn('Cannot focus invalid window')
      return
    }

    if (mainWindow!.isMinimized()) {
      mainWindow!.restore()
    }

    mainWindow!.show()
    mainWindow!.focus()

    log.info('Main window focused successfully')
  } catch (error) {
    logError('Failed to focus main window', error)
  }
}

/**
 * Show the main window (creates new one if needed)
 */
export async function showMainWindow(): Promise<void> {
  try {
    if (!isMainWindowValid()) {
      log.info('Window not valid, creating new window...')
      await createMainWindow({ show: true })
      return
    }

    focusMainWindow()
  } catch (error) {
    logError('Failed to show main window', error)
    throw error
  }
}

/**
 * Hide the main window
 */
export function hideMainWindow(): void {
  try {
    if (isMainWindowValid()) {
      hideWindow(mainWindow!)
      log.info('Main window hidden successfully')
    }
  } catch (error) {
    logError('Failed to hide main window', error)
    throw error
  }
}

/**
 * Close the main window
 */
export function closeMainWindow(): void {
  try {
    if (isMainWindowValid()) {
      mainWindow!.close()
      log.info('Main window closed successfully')
    }
  } catch (error) {
    logError('Failed to close main window', error)
    throw error
  }
}

/**
 * Minimize the main window
 */
export function minimizeMainWindow(): void {
  try {
    if (isMainWindowValid()) {
      mainWindow!.minimize()
      log.info('Main window minimized successfully')
    }
  } catch (error) {
    logError('Failed to minimize main window', error)
    throw error
  }
}

/**
 * Maximize or unmaximize the main window
 */
export function toggleMaximizeMainWindow(): void {
  try {
    if (!isMainWindowValid()) {
      logError(
        'Cannot maximize invalid window',
        new Error('Window is invalid'),
        { action: 'maximize' }
      )
      return
    }

    if (mainWindow!.isMaximized()) {
      mainWindow!.unmaximize()
      log.info('Main window unmaximized')
    } else {
      mainWindow!.maximize()
      log.info('Main window maximized')
    }
  } catch (error) {
    logError('Failed to toggle maximize main window', error)
    throw error
  }
}

/**
 * Check if the main window is maximized
 */
export function isMainWindowMaximized(): boolean {
  try {
    if (!isMainWindowValid()) {
      return false
    }
    return mainWindow!.isMaximized()
  } catch (error) {
    log.error('Failed to check if window is maximized:', error)
    return false
  }
}

/**
 * Send a message to the renderer process
 */
export function sendToMainWindowRenderer(
  channel: string,
  ...args: unknown[]
): void {
  try {
    if (isMainWindowValid()) {
      mainWindow!.webContents.send(channel, ...args)
      log.debug(`Message sent to renderer: ${channel}`)
    } else {
      log.warn(`Cannot send message to invalid window: ${channel}`)
    }
  } catch (error) {
    logError('Failed to send message to renderer', error, { channel })
    throw error
  }
}

/**
 * Wait for the window to be ready
 */
async function waitForMainWindowReady(): Promise<void> {
  try {
    if (!isMainWindowValid()) {
      logError(
        'Cannot wait for invalid window',
        new Error('Window is invalid'),
        { action: 'waitForReady' }
      )
      return
    }

    await pollWindowReady(mainWindow!)
    log.info('Main window is ready')
  } catch (error) {
    logError('Failed to wait for window ready', error)
    throw error
  }
}

/**
 * Recreate the window for graceful shutdown
 */
export async function recreateMainWindowForShutdown(): Promise<BrowserWindow> {
  try {
    log.info('Recreating window for graceful shutdown...')

    if (isMainWindowValid()) {
      log.info('Existing window is valid, showing it for shutdown')
      await showMainWindow()
      return mainWindow!
    }

    // Create new window for shutdown
    const shutdownWindow = await createMainWindow({ show: true })
    await waitForMainWindowReady()

    log.info('Window recreated successfully for shutdown')
    return shutdownWindow
  } catch (error) {
    logError('Failed to recreate window for shutdown', error)
    throw error
  }
}
