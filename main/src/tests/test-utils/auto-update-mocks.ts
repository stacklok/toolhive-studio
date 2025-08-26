import { vi, expect } from 'vitest'
import { EventEmitter } from 'node:events'
import type { BrowserWindow, Tray, Dialog } from 'electron'

/**
 * Utility functions for creating consistent mocks across auto-update tests
 */

interface MockAutoUpdater extends EventEmitter {
  checkForUpdates: () => void
  quitAndInstall: () => void
  setFeedURL: (options: unknown) => void
  getFeedURL: () => string
}

interface MockApp extends EventEmitter {
  quit: () => void
  relaunch: (options?: unknown) => void
  removeAllListeners: (event?: string | symbol) => this
}

export function createMockAutoUpdater(): MockAutoUpdater {
  const mockAutoUpdater = new EventEmitter() as MockAutoUpdater

  // Add Electron autoUpdater methods
  mockAutoUpdater.checkForUpdates = vi.fn()
  mockAutoUpdater.quitAndInstall = vi.fn()
  mockAutoUpdater.setFeedURL = vi.fn()
  mockAutoUpdater.getFeedURL = vi.fn()

  return mockAutoUpdater
}

export function createMockApp(): MockApp {
  const mockApp = new EventEmitter() as MockApp

  // Add Electron app methods
  mockApp.quit = vi.fn()
  mockApp.relaunch = vi.fn()
  mockApp.removeAllListeners = vi.fn(() => mockApp)

  return mockApp
}

export function createMockBrowserWindow(
  options: {
    isDestroyed?: boolean
    isMinimized?: boolean
  } = {}
): BrowserWindow {
  const { isDestroyed = false, isMinimized = false } = options

  return {
    isDestroyed: vi.fn(() => isDestroyed),
    isMinimized: vi.fn(() => isMinimized),
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    close: vi.fn(),
    webContents: {
      send: vi.fn(),
      once: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
      openDevTools: vi.fn(),
    },
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  } as unknown as BrowserWindow
}

export function createMockTray(
  options: {
    isDestroyed?: boolean
  } = {}
): Tray {
  const { isDestroyed = false } = options

  return {
    isDestroyed: vi.fn(() => isDestroyed),
    destroy: vi.fn(),
    setContextMenu: vi.fn(),
    setToolTip: vi.fn(),
  } as unknown as Tray
}

export function createMockDialog(): Dialog {
  return {
    showMessageBox: vi.fn().mockResolvedValue({ response: 1 }), // Default to "Later"
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showErrorBox: vi.fn(),
  } as unknown as Dialog
}

export interface AutoUpdateTestContext {
  mockAutoUpdater: MockAutoUpdater
  mockApp: MockApp
  mockMainWindow: BrowserWindow
  mockTray: Tray
  mockDialog: Dialog
  mockCreateWindow: () => BrowserWindow
}

export function setupAutoUpdateMocks(): AutoUpdateTestContext {
  const mockAutoUpdater = createMockAutoUpdater()
  const mockApp = createMockApp()
  const mockMainWindow = createMockBrowserWindow()
  const mockTray = createMockTray()
  const mockDialog = createMockDialog()
  const mockCreateWindow = vi.fn(() => mockMainWindow)

  return {
    mockAutoUpdater,
    mockApp,
    mockMainWindow,
    mockTray,
    mockDialog,
    mockCreateWindow,
  }
}

/**
 * Helper to simulate update events in sequence
 */
export async function simulateUpdateFlow(
  autoUpdater: EventEmitter,
  options: {
    version?: string
    includeChecking?: boolean
    includeAvailable?: boolean
    includeError?: boolean
    errorMessage?: string
  } = {}
) {
  const {
    version = 'v1.2.3-test',
    includeChecking = true,
    includeAvailable = true,
    includeError = false,
    errorMessage = 'Update failed',
  } = options

  if (includeChecking) {
    autoUpdater.emit('checking-for-update')
    await new Promise((resolve) => setImmediate(resolve))
  }

  if (includeAvailable) {
    autoUpdater.emit('update-available')
    await new Promise((resolve) => setImmediate(resolve))
  }

  if (includeError) {
    autoUpdater.emit('error', errorMessage)
  } else {
    autoUpdater.emit('update-downloaded', null, null, version)
  }

  await new Promise((resolve) => setImmediate(resolve))
}

/**
 * Helper to verify common update behavior
 */
export function expectUpdateBehavior(
  mocks: AutoUpdateTestContext,
  expectations: {
    dialogShown?: boolean
    gracefulExit?: boolean
    serversStopped?: boolean
    trayDestroyed?: boolean
    appQuit?: boolean
  }
) {
  if (expectations.dialogShown !== undefined) {
    if (expectations.dialogShown) {
      expect(mocks.mockDialog.showMessageBox).toHaveBeenCalled()
    } else {
      expect(mocks.mockDialog.showMessageBox).not.toHaveBeenCalled()
    }
  }

  if (expectations.gracefulExit) {
    expect(mocks.mockMainWindow.webContents.send).toHaveBeenCalledWith(
      'graceful-exit'
    )
  }

  if (expectations.appQuit) {
    expect(mocks.mockAutoUpdater.quitAndInstall).toHaveBeenCalled()
  }
}

/**
 * Mock electron modules for tests
 */
export function mockElectronModules(context: AutoUpdateTestContext) {
  vi.mock('electron', () => ({
    app: context.mockApp,
    autoUpdater: context.mockAutoUpdater,
    dialog: context.mockDialog,
    ipcMain: {
      handle: vi.fn(),
    },
  }))
}

/**
 * Mock common dependencies
 */
export function mockAutoUpdateDependencies() {
  vi.mock('update-electron-app', () => ({
    updateElectronApp: vi.fn(),
  }))

  vi.mock('../graceful-exit', () => ({
    stopAllServers: vi.fn().mockResolvedValue(undefined),
  }))

  vi.mock('../toolhive-manager', () => ({
    stopToolhive: vi.fn(),
    getToolhivePort: vi.fn(() => 3000),
    binPath: '/mock/bin/path',
    isToolhiveRunning: vi.fn(() => true),
  }))

  vi.mock('../system-tray', () => ({
    safeTrayDestroy: vi.fn(),
  }))

  vi.mock('../util', () => ({
    pollWindowReady: vi.fn().mockResolvedValue(undefined),
  }))

  vi.mock('../../../utils/delay', () => ({
    delay: vi.fn().mockResolvedValue(undefined),
  }))

  vi.mock('../logger', () => ({
    default: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  }))
}

/**
 * Restore process.platform after tests
 */
export function mockPlatform(platform: NodeJS.Platform) {
  const originalPlatform = process.platform

  Object.defineProperty(process, 'platform', {
    value: platform,
    writable: true,
  })

  return () => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
    })
  }
}
