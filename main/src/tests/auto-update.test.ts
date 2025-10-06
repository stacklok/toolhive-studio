import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import type { BrowserWindow, Tray } from 'electron'
import { app, autoUpdater, dialog, ipcMain } from 'electron'
import {
  initAutoUpdate,
  resetUpdateState,
  resetAllUpdateState,
  checkForUpdates,
  getUpdateState,
  setAutoUpdateEnabled,
  manualUpdate,
  getLatestAvailableVersion,
  type ReleaseInfo,
} from '../auto-update'

vi.mock('electron', () => {
  const mockAutoUpdater = new EventEmitter() as EventEmitter & {
    checkForUpdates: () => void
    quitAndInstall: () => void
    setFeedURL: (options: unknown) => void
    getFeedURL: () => string
  }
  Object.assign(mockAutoUpdater, {
    checkForUpdates: vi.fn(),
    quitAndInstall: vi.fn(),
    setFeedURL: vi.fn(),
    getFeedURL: vi.fn(),
  })

  const mockApp = new EventEmitter() as EventEmitter & {
    relaunch: (options?: unknown) => void
    quit: () => void
    removeAllListeners: (event?: string | symbol) => EventEmitter
  }
  const originalRemoveAllListeners = mockApp.removeAllListeners.bind(mockApp)
  Object.assign(mockApp, {
    relaunch: vi.fn(),
    quit: vi.fn(),
    removeAllListeners: vi.fn((event?: string | symbol) => {
      originalRemoveAllListeners(event)
      return mockApp
    }),
  })

  return {
    app: mockApp,
    autoUpdater: mockAutoUpdater,
    dialog: {
      showMessageBox: vi.fn(),
    },
    ipcMain: {
      handle: vi.fn(),
      removeHandler: vi.fn(),
    },
  }
})

// Mock update-electron-app
vi.mock('update-electron-app', () => ({
  updateElectronApp: vi.fn(),
}))

// Mock electron-store
vi.mock('electron-store', () => {
  const mockStoreInstance = {
    get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue ?? true),
    set: vi.fn(),
  }

  return {
    default: vi.fn().mockImplementation(() => mockStoreInstance),
  }
})

// Mock dependencies
vi.mock('../graceful-exit', () => ({
  stopAllServers: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../toolhive-manager', () => ({
  stopToolhive: vi.fn(),
  getToolhivePort: vi.fn(() => 3000),
  isToolhiveRunning: vi.fn(() => true),
  binPath: '/mock/bin/path',
}))

vi.mock('../system-tray', () => ({
  safeTrayDestroy: vi.fn(),
}))

vi.mock('../util', () => ({
  pollWindowReady: vi.fn().mockResolvedValue(undefined),
  getAppVersion: vi.fn(() => '1.0.0'),
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

vi.mock('../app-state', () => ({
  setTray: vi.fn(),
  getTray: vi.fn(),
  setQuittingState: vi.fn(),
  setTearingDownState: vi.fn(),
  getQuittingState: vi.fn(() => false),
  getTearingDownState: vi.fn(() => false),
}))

import { stopAllServers } from '../graceful-exit'
import { stopToolhive, getToolhivePort } from '../toolhive-manager'
import { safeTrayDestroy } from '../system-tray'
import { pollWindowReady } from '../util'
import { delay } from '../../../utils/delay'
import log from '../logger'
import { getTray } from '../app-state'

describe('auto-update', () => {
  describe('unit tests', () => {
    let mockMainWindow: BrowserWindow
    let mockTray: Tray

    beforeEach(() => {
      vi.clearAllMocks()

      // Use fake timers for consistent testing
      vi.useFakeTimers()

      // IMPORTANT: Reset ALL update state before each test
      resetAllUpdateState()

      // Create mock window
      mockMainWindow = {
        isDestroyed: vi.fn(() => false),
        isMinimized: vi.fn(() => false),
        restore: vi.fn(),
        webContents: {
          send: vi.fn(),
          removeAllListeners: vi.fn(),
          once: vi.fn(),
          on: vi.fn(),
        },
      } as unknown as BrowserWindow

      // Create mock tray
      mockTray = {
        isDestroyed: vi.fn(() => false),
        destroy: vi.fn(),
      } as unknown as Tray

      // Setup default mocks
      vi.mocked(stopAllServers).mockResolvedValue(undefined)
      vi.mocked(stopToolhive).mockReturnValue(undefined)
      vi.mocked(getToolhivePort).mockReturnValue(3000)
      vi.mocked(pollWindowReady).mockResolvedValue(undefined)
      vi.mocked(delay).mockResolvedValue(undefined)
      vi.mocked(dialog.showMessageBox).mockResolvedValue({
        response: 1,
        checkboxChecked: false,
      }) // "Later" by default

      // Set tray in app-state for tests
      vi.mocked(getTray).mockReturnValue(mockTray)

      // Initialize auto-update to register event handlers AFTER creating mocks
      initAutoUpdate({
        mainWindowGetter: () => mockMainWindow,
        windowCreator: async () => mockMainWindow,
      })
    })

    afterEach(() => {
      vi.resetAllMocks()
      // Restore real timers
      vi.useRealTimers()
      // Clean up any event listeners to prevent test interference
      vi.mocked(autoUpdater).removeAllListeners()
      vi.mocked(app).removeAllListeners()
    })

    describe('initAutoUpdate', () => {
      it('initializes update system correctly', () => {
        // Spy on autoUpdater.on to verify event registrations
        const onSpy = vi.spyOn(autoUpdater, 'on')

        // Reset and re-initialize to test
        resetAllUpdateState()
        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        // Verify IPC handler is registered
        expect(vi.mocked(ipcMain.handle)).toHaveBeenCalledWith(
          'install-update-and-restart',
          expect.any(Function)
        )

        // Verify autoUpdater event listeners are registered and called
        expect(onSpy).toHaveBeenCalledWith(
          'update-downloaded',
          expect.any(Function)
        )
        expect(onSpy).toHaveBeenCalledWith(
          'checking-for-update',
          expect.any(Function)
        )
        expect(onSpy).toHaveBeenCalledWith(
          'update-available',
          expect.any(Function)
        )
        expect(onSpy).toHaveBeenCalledWith(
          'update-not-available',
          expect.any(Function)
        )
        expect(onSpy).toHaveBeenCalledWith('error', expect.any(Function))

        onSpy.mockRestore()
      })

      it('sets up mock update notification in development', async () => {
        const originalNodeEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        resetAllUpdateState()
        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        // Simulate mock update event
        vi.mocked(autoUpdater).emit(
          'update-downloaded',
          null,
          null,
          'v1.0.0-mock'
        )

        // Advance timers by 2200ms to trigger mock update
        await vi.advanceTimersByTimeAsync(2200)

        expect(vi.mocked(dialog.showMessageBox)).toHaveBeenCalled()

        process.env.NODE_ENV = originalNodeEnv
      })
    })

    describe('auto-updater events', () => {
      it('handles update-downloaded event with user clicking restart', async () => {
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        }) // "Restart"

        const updatePromise = new Promise<void>((resolve) => {
          vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => resolve())
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await updatePromise

        expect(vi.mocked(dialog.showMessageBox)).toHaveBeenCalled()
        expect(vi.mocked(stopAllServers)).toHaveBeenCalled()
        expect(vi.mocked(stopToolhive)).toHaveBeenCalled()
        expect(vi.mocked(safeTrayDestroy)).toHaveBeenCalled()
      })

      it('handles update-downloaded event with user clicking later', async () => {
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 1,
          checkboxChecked: false,
        }) // "Later"

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        // Run all pending timers to complete async operations
        await vi.runAllTimersAsync()

        expect(vi.mocked(dialog.showMessageBox)).toHaveBeenCalled()
        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          'update-downloaded'
        )
        expect(vi.mocked(stopAllServers)).not.toHaveBeenCalled()
      })

      it('prevents concurrent update operations', async () => {
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        }) // "Restart"

        // First update attempt
        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        // Second update attempt while first is in progress
        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.4')

        await vi.runAllTimersAsync()

        expect(vi.mocked(log).warn).toHaveBeenCalledWith(
          '[update] Update installation already in progress'
        )
      })

      it('recreates window when destroyed', async () => {
        // Change existing window mock to return destroyed
        vi.mocked(mockMainWindow.isDestroyed).mockReturnValue(true)

        const newWindow = {
          isDestroyed: vi.fn(() => false),
          isMinimized: vi.fn(() => false),
          restore: vi.fn(),
          webContents: { send: vi.fn() },
        } as unknown as BrowserWindow

        const createWindowSpy = vi.fn().mockResolvedValue(newWindow)

        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 1,
          checkboxChecked: false,
        }) // "Later"

        // Re-initialize with new window creator
        resetAllUpdateState()
        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: createWindowSpy,
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await vi.runAllTimersAsync()

        expect(createWindowSpy).toHaveBeenCalled()
        expect(vi.mocked(pollWindowReady)).toHaveBeenCalledWith(newWindow)
      })

      it('handles window creation failure gracefully', async () => {
        // Change existing window mock to return destroyed
        vi.mocked(mockMainWindow.isDestroyed).mockReturnValue(true)

        const failingCreator = vi
          .fn()
          .mockRejectedValue(new Error('Window creation failed'))

        // Re-initialize with failing window creator
        resetAllUpdateState()
        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: failingCreator,
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await vi.runAllTimersAsync()

        expect(vi.mocked(log).error).toHaveBeenCalledWith(
          '[update] Failed to create window for update dialog: ',
          expect.any(Error)
        )
      })

      it('restores minimized window', async () => {
        const minimizedWindow = {
          isDestroyed: vi.fn(() => false),
          isMinimized: vi.fn(() => true),
          restore: vi.fn(),
          webContents: {
            send: vi.fn(),
          },
        } as unknown as BrowserWindow

        // Re-initialize with minimized window
        resetAllUpdateState()
        initAutoUpdate({
          mainWindowGetter: () => minimizedWindow,
          windowCreator: async () => mockMainWindow,
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await vi.runAllTimersAsync()

        expect(minimizedWindow.restore).toHaveBeenCalled()
      })

      it('handles server shutdown failure gracefully', async () => {
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        }) // "Restart"
        vi.mocked(stopAllServers).mockRejectedValue(
          new Error('Server shutdown failed')
        )

        let quitAndInstallCalled = false
        vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => {
          quitAndInstallCalled = true
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        // Run all timers to complete dialog and update flow
        await vi.runAllTimersAsync()

        expect(quitAndInstallCalled).toBe(true)
        expect(vi.mocked(log).warn).toHaveBeenCalledWith(
          '[update] Server shutdown failed, proceeding with update anyway'
        )
        expect(vi.mocked(stopToolhive)).toHaveBeenCalled()
      })

      it('handles update state events correctly', () => {
        expect(getUpdateState()).toBe('none')

        vi.mocked(autoUpdater).emit('checking-for-update')
        expect(getUpdateState()).toBe('checking')

        vi.mocked(autoUpdater).emit('update-available')
        expect(getUpdateState()).toBe('downloading')

        vi.mocked(autoUpdater).emit('update-downloaded')
        expect(getUpdateState()).toBe('downloaded')
      })

      it('ignores update-not-available during download', () => {
        vi.mocked(autoUpdater).emit('update-available')
        expect(getUpdateState()).toBe('downloading')

        vi.mocked(autoUpdater).emit('update-not-available')
        expect(getUpdateState()).toBe('downloading')

        expect(vi.mocked(log).warn).toHaveBeenCalledWith(
          '[update] update became unavailable during download - ignoring'
        )
      })

      it('handles update errors', () => {
        vi.mocked(autoUpdater).emit('error', 'Update failed')

        expect(vi.mocked(log).error).toHaveBeenCalledWith(
          '[update] there was a problem updating the application: ',
          'Update failed'
        )
        expect(getUpdateState()).toBe('none')
      })
    })

    describe('IPC handlers', () => {
      let installHandler: (
        ...args: unknown[]
      ) => Promise<{ success: boolean; error?: string }>

      beforeEach(() => {
        const installCall = vi
          .mocked(ipcMain.handle)
          .mock.calls.find((call) => call[0] === 'install-update-and-restart')

        installHandler = installCall?.[1] as (
          ...args: unknown[]
        ) => Promise<{ success: boolean; error?: string }>
      })

      it('handles install-update-and-restart IPC', async () => {
        const updatePromise = new Promise<void>((resolve) => {
          vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => resolve())
        })

        const resultPromise = installHandler()
        await updatePromise

        const result = await resultPromise
        expect(result).toEqual({ success: true })
        expect(vi.mocked(stopAllServers)).toHaveBeenCalled()
        expect(vi.mocked(stopToolhive)).toHaveBeenCalled()
      })

      it('prevents concurrent IPC update installation', async () => {
        // Directly set state to installing by calling IPC handler first
        vi.mocked(autoUpdater).quitAndInstall = vi.fn()

        // Start first installation (this will set state to 'installing')
        const firstInstall = installHandler()

        // Immediately try second installation while first is in progress
        const result = await installHandler()

        expect(result).toEqual({
          success: false,
          error: 'Update already in progress',
        })

        // Clean up first installation
        await firstInstall
      })

      it('handles IPC installation failure', async () => {
        // Mock autoUpdater.quitAndInstall to throw (this will actually cause performUpdateInstallation to throw)
        vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => {
          throw new Error('QuitAndInstall failed')
        })

        const result = await installHandler()

        expect(result.success).toBe(false)
        expect(result.error).toContain('QuitAndInstall failed')
      })

      it('reports update progress correctly', async () => {
        // Initially, no update is in progress
        expect(getUpdateState()).toBe('none')

        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        })

        const updatePromise = new Promise<void>((resolve) => {
          vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => resolve())
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await updatePromise

        // After update process starts, state should be 'installing'
        expect(getUpdateState()).toBe('installing')
      })
    })

    describe('utility functions', () => {
      it('resets update state', () => {
        vi.mocked(autoUpdater).emit('checking-for-update')
        expect(getUpdateState()).toBe('checking')

        resetUpdateState()
        expect(getUpdateState()).toBe('none')
      })

      it('checks for updates when state is none', () => {
        expect(getUpdateState()).toBe('none')

        checkForUpdates()
        expect(vi.mocked(autoUpdater).checkForUpdates).toHaveBeenCalled()
      })

      it('does not check for updates when state is not none', () => {
        vi.mocked(autoUpdater).emit('checking-for-update')
        expect(getUpdateState()).toBe('checking')

        checkForUpdates()
        expect(vi.mocked(autoUpdater).checkForUpdates).not.toHaveBeenCalled()
      })
    })

    describe('error handling and recovery', () => {
      beforeEach(() => {
        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })
      })

      it('handles update installation failure with recovery', async () => {
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        }) // "Restart"
        // Mock autoUpdater.quitAndInstall to throw (this will trigger the recovery logic)
        vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => {
          throw new Error('Installation failed')
        })

        const appRelaunchSpy = vi.fn()
        const appQuitSpy = vi.fn()
        const processExitSpy = vi.fn()

        // Mock app methods
        vi.mocked(app).relaunch = appRelaunchSpy
        vi.mocked(app).quit = appQuitSpy

        // Mock process.exit
        const originalExit = process.exit
        process.exit = processExitSpy as unknown as (code?: number) => never

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await vi.runAllTimersAsync()

        expect(vi.mocked(log).error).toHaveBeenCalledWith(
          '[update] error during update installation:',
          expect.any(Error)
        )
        expect(appRelaunchSpy).toHaveBeenCalled()
        expect(appQuitSpy).toHaveBeenCalled()

        // Restore process.exit
        process.exit = originalExit
      })

      it('handles dialog error gracefully', async () => {
        vi.mocked(dialog.showMessageBox).mockRejectedValue(
          new Error('Dialog failed')
        )

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await vi.runAllTimersAsync()

        expect(vi.mocked(log).error).toHaveBeenCalledWith(
          '[update] error in update-downloaded handler:',
          expect.any(Error)
        )
      })

      describe('platform-specific behavior', () => {
        it('shows correct dialog on macOS', async () => {
          const originalPlatform = process.platform
          Object.defineProperty(process, 'platform', { value: 'darwin' })

          vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

          await vi.runAllTimersAsync()

          expect(vi.mocked(dialog.showMessageBox)).toHaveBeenCalledWith(
            mockMainWindow,
            expect.objectContaining({
              message: 'Release v1.2.3',
              detail:
                'A new version has been downloaded.\nRestart the application to apply the updates.',
            })
          )

          Object.defineProperty(process, 'platform', {
            value: originalPlatform,
          })
        })

        it('shows correct dialog on Windows', async () => {
          const originalPlatform = process.platform
          Object.defineProperty(process, 'platform', { value: 'win32' })

          vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

          await vi.runAllTimersAsync()

          expect(vi.mocked(dialog.showMessageBox)).toHaveBeenCalledWith(
            mockMainWindow,
            expect.objectContaining({
              message:
                'A new version has been downloaded.\nRestart the application to apply the updates.',
              detail: 'Ready to install v1.2.3',
            })
          )

          Object.defineProperty(process, 'platform', {
            value: originalPlatform,
          })
        })
      })
    })

    describe('integration tests', () => {
      let mockMainWindow: BrowserWindow
      let mockTray: Tray

      beforeEach(() => {
        vi.clearAllMocks()

        // Use fake timers for consistent testing
        vi.useFakeTimers()

        // Reset all update state between tests
        resetAllUpdateState()

        // Setup mock window and tray
        mockMainWindow = {
          isDestroyed: vi.fn(() => false),
          isMinimized: vi.fn(() => false),
          restore: vi.fn(),
          webContents: {
            send: vi.fn(),
          },
        } as unknown as BrowserWindow

        mockTray = {
          isDestroyed: vi.fn(() => false),
          destroy: vi.fn(),
        } as unknown as Tray

        // Set tray in app-state for integration tests
        vi.mocked(getTray).mockReturnValue(mockTray)
      })

      afterEach(() => {
        vi.resetAllMocks()
        // Restore real timers
        vi.useRealTimers()
        // Clean up event listeners to prevent memory leaks
        vi.mocked(autoUpdater).removeAllListeners()
        vi.mocked(app).removeAllListeners()
      })

      it('integrates with graceful exit during update', async () => {
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        })

        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        const updatePromise = new Promise<void>((resolve) => {
          vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => resolve())
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await updatePromise

        // Should call graceful exit sequence
        expect(vi.mocked(stopAllServers)).toHaveBeenCalled()
        expect(vi.mocked(stopToolhive)).toHaveBeenCalled()
        expect(vi.mocked(safeTrayDestroy)).toHaveBeenCalled()
      })

      it('handles server shutdown failure during update', async () => {
        vi.mocked(stopAllServers).mockRejectedValue(
          new Error('Server stop failed')
        )
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        })

        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        const updatePromise = new Promise<void>((resolve) => {
          vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => resolve())
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await updatePromise

        // Should proceed with update despite server shutdown failure
        expect(vi.mocked(stopAllServers)).toHaveBeenCalled()
        expect(vi.mocked(stopToolhive)).toHaveBeenCalled()
        expect(vi.mocked(autoUpdater).quitAndInstall).toHaveBeenCalled()
      })

      it('integrates with toolhive manager port detection', async () => {
        vi.mocked(getToolhivePort).mockReturnValue(undefined)
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        })

        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        const updatePromise = new Promise<void>((resolve) => {
          vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => resolve())
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await updatePromise

        // Should skip server shutdown when no port is available
        expect(vi.mocked(getToolhivePort)).toHaveBeenCalled()
        expect(vi.mocked(stopAllServers)).not.toHaveBeenCalled()
      })

      it('handles missing toolhive port gracefully', async () => {
        vi.mocked(getToolhivePort).mockReturnValue(undefined)
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        })

        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        const updatePromise = new Promise<void>((resolve) => {
          vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => resolve())
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await updatePromise

        expect(vi.mocked(log).info).toHaveBeenCalledWith(
          '[update] No ToolHive port available, skipping server shutdown'
        )
      })

      it('integrates with system tray destruction', async () => {
        const mockTrayWithDestroy = {
          isDestroyed: vi.fn(() => false),
          destroy: vi.fn(),
        } as unknown as Tray

        // Set the specific tray for this test
        vi.mocked(getTray).mockReturnValue(mockTrayWithDestroy)

        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        })

        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        const updatePromise = new Promise<void>((resolve) => {
          vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => resolve())
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await updatePromise

        expect(vi.mocked(safeTrayDestroy)).toHaveBeenCalled()
      })

      it('respects event listener removal during update', async () => {
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        })

        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        // Add some listeners to app
        const beforeQuitSpy = vi.fn()
        const willQuitSpy = vi.fn()
        vi.mocked(app).on('before-quit', beforeQuitSpy)
        vi.mocked(app).on('will-quit', willQuitSpy)

        const updatePromise = new Promise<void>((resolve) => {
          vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => resolve())
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await updatePromise

        // Listeners should be removed
        expect(vi.mocked(app).listenerCount('before-quit')).toBe(0)
        expect(vi.mocked(app).listenerCount('will-quit')).toBe(0)
      })

      it('handles window recreation with polling integration', async () => {
        const destroyedWindow = {
          isDestroyed: vi.fn(() => true),
        } as unknown as BrowserWindow

        const newWindow = {
          isDestroyed: vi.fn(() => false),
          isMinimized: vi.fn(() => false),
          restore: vi.fn(),
          webContents: { send: vi.fn() },
        } as unknown as BrowserWindow

        const createWindow = vi.fn(async () => newWindow)
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 1,
          checkboxChecked: false,
        }) // Later

        // Re-initialize with destroyed window
        resetAllUpdateState()
        initAutoUpdate({
          mainWindowGetter: () => destroyedWindow,
          windowCreator: createWindow,
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        await vi.runAllTimersAsync()

        // Should create new window and poll for readiness
        expect(createWindow).toHaveBeenCalled()
        expect(vi.mocked(pollWindowReady)).toHaveBeenCalledWith(newWindow)
      })

      it('handles server shutdown failure scenarios', async () => {
        // Mock failure by making stopAllServers reject
        vi.mocked(stopAllServers).mockRejectedValue(
          new Error('Server shutdown failed')
        )
        vi.mocked(dialog.showMessageBox).mockResolvedValue({
          response: 0,
          checkboxChecked: false,
        })

        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        let quitAndInstallCalled = false
        vi.mocked(autoUpdater).quitAndInstall = vi.fn(() => {
          quitAndInstallCalled = true
        })

        vi.mocked(autoUpdater).emit('update-downloaded', null, null, 'v1.2.3')

        // Run all timers to complete the update flow
        await vi.runAllTimersAsync()

        expect(quitAndInstallCalled).toBe(true)
        // Should have logged shutdown failure warning
        expect(vi.mocked(log.warn)).toHaveBeenCalledWith(
          '[update] Server shutdown failed, proceeding with update anyway'
        )
      })
    })

    describe('getLatestAvailableVersion', () => {
      const originalFetch = global.fetch

      afterEach(() => {
        global.fetch = originalFetch
      })

      it('returns latest version when available for current platform', async () => {
        const mockResponse: ReleaseInfo = {
          tag: 'v1.5.0',
          prerelease: false,
          published_at: '2024-01-01',
          base_url: 'https://example.com',
          assets: [
            { name: 'app-darwin-arm64.zip', url: '', size: 100, sha256: '' },
          ],
        }

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        })

        const result = await getLatestAvailableVersion()

        expect(result).toEqual({
          currentVersion: '1.0.0',
          latestVersion: 'v1.5.0',
          isNewVersionAvailable: true,
        })
      })

      it('returns no update when latest version is not available for platform', async () => {
        const mockResponse: ReleaseInfo = {
          tag: 'v1.5.0',
          prerelease: false,
          published_at: '2024-01-01',
          base_url: 'https://example.com',
          assets: [{ name: 'app-other.zip', url: '', size: 100, sha256: '' }],
        }

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        })

        const result = await getLatestAvailableVersion()

        expect(result).toEqual({
          currentVersion: '1.0.0',
          latestVersion: undefined,
          isNewVersionAvailable: false,
        })
      })

      it('handles fetch failure gracefully', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

        const result = await getLatestAvailableVersion()

        expect(result).toEqual({
          currentVersion: '1.0.0',
          latestVersion: undefined,
          isNewVersionAvailable: false,
        })
        expect(vi.mocked(log).error).toHaveBeenCalledWith(
          '[update] Failed to check for ToolHive update: ',
          expect.any(Error)
        )
      })

      it('handles non-ok response', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        })

        const result = await getLatestAvailableVersion()

        expect(result).toEqual({
          currentVersion: '1.0.0',
          latestVersion: undefined,
          isNewVersionAvailable: false,
        })
        expect(vi.mocked(log).error).toHaveBeenCalledWith(
          '[update] Failed to check for ToolHive update: ',
          'Not Found'
        )
      })
    })

    describe('setAutoUpdateEnabled', () => {
      it('disables auto-update and clears state', () => {
        // First enable it
        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        // Set to checking state
        vi.mocked(autoUpdater).emit('checking-for-update')
        expect(getUpdateState()).toBe('checking')

        // Disable auto-update
        setAutoUpdateEnabled(false)

        expect(getUpdateState()).toBe('none')
        expect(vi.mocked(ipcMain.removeHandler)).toHaveBeenCalledWith(
          'install-update-and-restart'
        )
      })

      it('re-enables auto-update after being disabled', () => {
        // Initialize first
        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        // Disable
        setAutoUpdateEnabled(false)

        // Re-enable
        setAutoUpdateEnabled(true)

        // Should re-register IPC handler
        const calls = vi.mocked(ipcMain.handle).mock.calls
        const installHandlerCalls = calls.filter(
          (call) => call[0] === 'install-update-and-restart'
        )
        expect(installHandlerCalls.length).toBeGreaterThan(0)
      })
    })

    describe('manualUpdate', () => {
      it('logs error when initAutoUpdate was not called first', () => {
        // Reset to clear any previous initialization
        resetAllUpdateState()

        manualUpdate()

        expect(vi.mocked(log).error).toHaveBeenCalledWith(
          '[update] Cannot perform manual update: initAutoUpdate was not called first'
        )
      })

      it('calls initAutoUpdate with isManualUpdate flag', () => {
        // Initialize first
        initAutoUpdate({
          mainWindowGetter: () => mockMainWindow,
          windowCreator: async () => mockMainWindow,
        })

        // Clear previous IPC handler calls
        vi.clearAllMocks()

        // Spy on autoUpdater.on to verify event registrations
        const onSpy = vi.spyOn(autoUpdater, 'on')

        // Call manual update
        manualUpdate()

        // Verify IPC handler was registered again
        expect(vi.mocked(ipcMain.handle)).toHaveBeenCalledWith(
          'install-update-and-restart',
          expect.any(Function)
        )

        // Verify autoUpdater event listeners are registered
        expect(onSpy).toHaveBeenCalledWith(
          'update-downloaded',
          expect.any(Function)
        )
        expect(onSpy).toHaveBeenCalledWith(
          'checking-for-update',
          expect.any(Function)
        )
        expect(onSpy).toHaveBeenCalledWith(
          'update-available',
          expect.any(Function)
        )
        expect(onSpy).toHaveBeenCalledWith(
          'update-not-available',
          expect.any(Function)
        )
        expect(onSpy).toHaveBeenCalledWith('error', expect.any(Function))

        onSpy.mockRestore()
      })
    })
  })
})
