import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { app } from 'electron'
import { EventEmitter } from 'node:events'
import {
  startToolhive,
  getToolhivePort,
  getToolhiveMcpPort,
  isToolhiveRunning,
  stopToolhive,
  restartToolhive,
} from '../toolhive-manager'
import { updateTrayStatus } from '../system-tray'
import log from '../logger'
import * as Sentry from '@sentry/electron/main'
import { getQuittingState } from '../app-state'

// Mock dependencies
vi.mock('node:child_process')
vi.mock('node:fs')
vi.mock('node:net')
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn().mockReturnValue('/test/userData'),
  },
  ipcMain: {
    handle: vi.fn(),
  },
}))
vi.mock('../system-tray')
vi.mock('../logger')
vi.mock('../app-state', () => ({
  getQuittingState: vi.fn().mockReturnValue(false),
}))
vi.mock('@sentry/electron/main', () => ({
  captureMessage: vi.fn(),
  withScope: vi.fn((callback) => {
    const mockScope = {
      addBreadcrumb: vi.fn(),
    }
    callback(mockScope)
  }),
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

const mockSpawn = vi.mocked(spawn)
const mockExistsSync = vi.mocked(existsSync)
const mockNet = vi.mocked(net)
const mockApp = vi.mocked(app)
const mockUpdateTrayStatus = vi.mocked(updateTrayStatus)
const mockLog = vi.mocked(log)
const mockCaptureMessage = vi.mocked(Sentry.captureMessage)
const mockGetQuittingState = vi.mocked(getQuittingState)

// Mock process for testing
class MockProcess extends EventEmitter {
  pid = 12345
  killed = false
  kill() {
    // Don't automatically set killed - let tests control this
    // This allows testing delayed SIGKILL scenarios
    return true
  }
}

// Mock server for net.createServer
class MockServer extends EventEmitter {
  private _port: number | null = null

  listen(port: number, callback?: () => void) {
    // Use fake timers - will be controlled by vi.advanceTimersByTime()
    setTimeout(() => {
      if (port === 0) {
        // Simulate OS assigning a random port
        this._port = Math.floor(Math.random() * 10000) + 10000
      } else {
        this._port = port
      }
      callback?.()
    }, 10)
  }

  address() {
    return { port: this._port }
  }

  close(callback?: () => void) {
    setTimeout(() => {
      callback?.()
    }, 10)
  }
}

describe('toolhive-manager', () => {
  let mockProcess: MockProcess

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Reset module state
    stopToolhive()

    // Setup mocks
    mockProcess = new MockProcess()

    mockSpawn.mockReturnValue(
      mockProcess as unknown as ReturnType<typeof spawn>
    )
    mockExistsSync.mockReturnValue(true)
    Object.defineProperty(mockApp, 'isPackaged', {
      value: false,
      configurable: true,
    })
    vi.mocked(mockApp.getPath).mockReturnValue('/test/userData')

    // Mock net.createServer to return a new MockServer instance each time
    mockNet.createServer.mockImplementation(
      () => new MockServer() as unknown as net.Server
    )

    // Mock logger methods
    mockLog.info = vi.fn()
    mockLog.error = vi.fn()
    mockLog.warn = vi.fn()
    mockLog.debug = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  describe('startToolhive', () => {
    it('returns early if binary does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      await startToolhive()

      expect(mockLog.error).toHaveBeenCalledWith(
        expect.stringContaining('ToolHive binary not found at:')
      )
      expect(mockSpawn).not.toHaveBeenCalled()
      expect(isToolhiveRunning()).toBe(false)
    })

    it('finds free ports and starts the process successfully', async () => {
      const startPromise = startToolhive()

      // Advance timers to complete async port finding
      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('thv'),
        expect.arrayContaining([
          'serve',
          '--openapi',
          '--experimental-mcp',
          '--experimental-mcp-host=127.0.0.1',
          expect.stringMatching(/--experimental-mcp-port=\d+/),
          '--host=127.0.0.1',
          expect.stringMatching(/--port=\d+/),
        ]),
        {
          stdio: ['ignore', 'ignore', 'pipe'],
          detached: false,
          windowsHide: true,
        }
      )

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting ToolHive from:')
      )
      expect(isToolhiveRunning()).toBe(true)
      expect(getToolhivePort()).toBeTypeOf('number')
      expect(getToolhiveMcpPort()).toBeTypeOf('number')
    })

    it('updates tray status after starting', async () => {
      const startPromise = startToolhive()

      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      expect(mockUpdateTrayStatus).toHaveBeenCalledWith(true)
    })

    it('logs process PID after spawning', async () => {
      const startPromise = startToolhive()

      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      expect(mockLog.info).toHaveBeenCalledWith(
        '[startToolhive] Process spawned with PID: 12345'
      )
    })

    it('handles process error events', async () => {
      const startPromise = startToolhive()

      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      const testError = new Error('Test spawn error')
      mockProcess.emit('error', testError)

      expect(mockLog.error).toHaveBeenCalledWith(
        'Failed to start ToolHive: ',
        testError
      )
      expect(mockCaptureMessage).toHaveBeenCalledWith(
        `Failed to start ToolHive: ${JSON.stringify(testError)}`,
        'fatal'
      )
      expect(mockUpdateTrayStatus).toHaveBeenCalledWith(false)
    })

    it('handles process exit events', async () => {
      const startPromise = startToolhive()

      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      mockProcess.killed = true
      mockProcess.emit('exit', 1)

      expect(mockLog.warn).toHaveBeenCalledWith(
        'ToolHive process exited with code: 1'
      )
      expect(mockUpdateTrayStatus).toHaveBeenCalledWith(false)
      expect(isToolhiveRunning()).toBe(false)
    })

    it('captures Sentry message when process exits unexpectedly', async () => {
      mockGetQuittingState.mockReturnValue(false)

      const startPromise = startToolhive()

      // Advancing the timer actually allows the promise to resolve
      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      mockCaptureMessage.mockClear()

      mockProcess.killed = true
      mockProcess.emit('exit', 1)

      expect(mockCaptureMessage).toHaveBeenCalledWith(
        'ToolHive process exited with code: 1',
        'fatal'
      )
    })

    it('does not capture Sentry message when app is quitting', async () => {
      mockGetQuittingState.mockReturnValue(true)

      const startPromise = startToolhive()

      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      mockCaptureMessage.mockClear()

      mockProcess.killed = true
      mockProcess.emit('exit', 0)

      expect(mockCaptureMessage).not.toHaveBeenCalled()
    })

    it('does not capture Sentry message when process exits during restart', async () => {
      mockGetQuittingState.mockReturnValue(false)

      // Start initial process
      const startPromise = startToolhive()
      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      mockCaptureMessage.mockClear()

      // Create a new mock process for the restart
      const newMockProcess = new MockProcess()
      mockSpawn.mockReturnValue(
        newMockProcess as unknown as ReturnType<typeof spawn>
      )

      // Start restart (this sets isRestarting = true)
      const restartPromise = restartToolhive()

      // Let the original process exit during restart
      mockProcess.killed = true
      mockProcess.emit('exit', 0)

      await vi.advanceTimersByTimeAsync(50)
      await restartPromise

      // Advance time to complete restart timeout
      await vi.advanceTimersByTimeAsync(5000)

      // Should not have called Sentry because isRestarting was true
      expect(mockCaptureMessage).not.toHaveBeenCalled()
    })

    it('assigns different ports to main and MCP services', async () => {
      const startPromise = startToolhive()

      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      const toolhivePort = getToolhivePort()
      const mcpPort = getToolhiveMcpPort()

      expect(toolhivePort).toBeTypeOf('number')
      expect(mcpPort).toBeTypeOf('number')
      expect(toolhivePort).not.toBe(mcpPort)
    })

    it('uses range for main port but any port for MCP', async () => {
      const startPromise = startToolhive()

      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      const toolhivePort = getToolhivePort()
      const mcpPort = getToolhiveMcpPort()

      // Main port should be in preferred range (when available) or fallback
      expect(toolhivePort).toBeTypeOf('number')
      // MCP port can be any available port
      expect(mcpPort).toBeTypeOf('number')
      expect(toolhivePort).not.toBe(mcpPort)

      // Verify the log message includes both ports
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringMatching(
          /Starting ToolHive from: .+ on port \d+, MCP on port \d+/
        )
      )
    })

    it('spawns process with correct arguments structure', async () => {
      const startPromise = startToolhive()

      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String), // Binary path (platform-specific)
        expect.arrayContaining([
          'serve',
          '--openapi',
          '--experimental-mcp',
          '--experimental-mcp-host=127.0.0.1',
          expect.stringMatching(/--experimental-mcp-port=\d+/),
          '--host=127.0.0.1',
          expect.stringMatching(/--port=\d+/),
        ]),
        {
          stdio: ['ignore', 'ignore', 'pipe'],
          detached: false,
          windowsHide: true,
        }
      )
    })
  })

  describe('port finding with fallback', () => {
    it('falls back to random port when preferred range is unavailable', async () => {
      // Mock all ports in range to be unavailable, then allow random port
      mockNet.createServer.mockImplementation(() => {
        const server = new MockServer() as unknown as net.Server
        const originalListen = server.listen.bind(server)

        server.listen = vi
          .fn()
          .mockImplementation((port: number, callback?: () => void) => {
            if (port >= 50000 && port <= 50100) {
              // Simulate all ports in range being unavailable
              setTimeout(() => {
                server.emit('error', { code: 'EADDRINUSE' })
              }, 5)
            } else if (port === 0) {
              // Allow OS assignment (fallback)
              setTimeout(() => {
                originalListen(port, callback)
              }, 5)
            } else {
              // Any other specific port
              originalListen(port, callback)
            }
          })

        return server
      })

      const startPromise = startToolhive()

      // Advance timers to complete all async operations including fallback attempts
      await vi.advanceTimersByTimeAsync(1000)
      await startPromise

      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'No free port found in range 50000-50100, falling back to random port'
        )
      )
      expect(isToolhiveRunning()).toBe(true)
    })
  })

  describe('stopToolhive', () => {
    beforeEach(async () => {
      // Start a process before each stop test
      const startPromise = startToolhive()
      await vi.advanceTimersByTimeAsync(50)
      await startPromise
      vi.clearAllMocks()
    })

    it('does nothing if no process is running', () => {
      stopToolhive() // Stop once
      vi.clearAllMocks()

      stopToolhive() // Try to stop again

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('No process to stop')
      )
    })

    it('sends SIGTERM by default for graceful shutdown', () => {
      const killSpy = vi.spyOn(mockProcess, 'kill')

      stopToolhive()

      expect(killSpy).toHaveBeenCalledWith('SIGTERM')
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('SIGTERM sent, result:')
      )
    })

    it('schedules SIGKILL after 2 seconds if process does not exit gracefully', async () => {
      // Mock the process to not be killed immediately
      const killSpy = vi.spyOn(mockProcess, 'kill')
      mockProcess.killed = false

      stopToolhive()

      // SIGTERM should be sent immediately
      expect(killSpy).toHaveBeenCalledWith('SIGTERM')
      expect(killSpy).toHaveBeenCalledTimes(1)

      // Advance time by less than 2 seconds - SIGKILL should not be sent yet
      await vi.advanceTimersByTimeAsync(1000)
      expect(killSpy).toHaveBeenCalledTimes(1)

      // Advance to 2 seconds - SIGKILL should be sent
      await vi.advanceTimersByTimeAsync(1000)
      expect(killSpy).toHaveBeenCalledWith('SIGKILL')
      expect(killSpy).toHaveBeenCalledTimes(2)
      expect(mockLog.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Process 12345 did not exit gracefully, forcing SIGKILL'
        )
      )
    })

    it('does not send SIGKILL if process exits gracefully within 2 seconds', async () => {
      const killSpy = vi.spyOn(mockProcess, 'kill')

      stopToolhive()

      // SIGTERM sent
      expect(killSpy).toHaveBeenCalledWith('SIGTERM')

      // Simulate process exiting gracefully
      mockProcess.killed = true

      // Advance time to when SIGKILL would have been sent
      await vi.advanceTimersByTimeAsync(2000)

      // SIGKILL should NOT be sent since process already exited
      expect(killSpy).toHaveBeenCalledTimes(1)
      expect(killSpy).not.toHaveBeenCalledWith('SIGKILL')
    })

    it('sends immediate SIGKILL when force option is true', () => {
      const killSpy = vi.spyOn(mockProcess, 'kill')

      stopToolhive({ force: true })

      expect(killSpy).toHaveBeenCalledWith('SIGKILL')
      expect(killSpy).toHaveBeenCalledTimes(1)
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('[stopToolhive] SIGKILL sent, result:')
      )
    })

    it('does not schedule delayed SIGKILL when force option is true', async () => {
      const killSpy = vi.spyOn(mockProcess, 'kill')
      mockProcess.killed = false

      stopToolhive({ force: true })

      // Immediate SIGKILL sent
      expect(killSpy).toHaveBeenCalledWith('SIGKILL')
      expect(killSpy).toHaveBeenCalledTimes(1)

      // Advance time - no additional kill should occur
      await vi.advanceTimersByTimeAsync(2000)
      expect(killSpy).toHaveBeenCalledTimes(1)
    })

    it('clears pending kill timer when called multiple times', async () => {
      mockProcess.killed = false

      // Start first process
      const startPromise1 = startToolhive()
      await vi.advanceTimersByTimeAsync(50)
      await startPromise1

      const firstProcess = mockProcess
      const firstKillSpy = vi.spyOn(firstProcess, 'kill')

      stopToolhive() // First stop - schedules SIGKILL
      expect(firstKillSpy).toHaveBeenCalledWith('SIGTERM')

      // Before timer fires, start and stop again
      await vi.advanceTimersByTimeAsync(500)

      const newMockProcess = new MockProcess()
      mockSpawn.mockReturnValue(
        newMockProcess as unknown as ReturnType<typeof spawn>
      )

      const startPromise2 = startToolhive()
      await vi.advanceTimersByTimeAsync(50)
      await startPromise2

      const secondKillSpy = vi.spyOn(newMockProcess, 'kill')

      stopToolhive() // Second stop - should clear first timer

      // Advance past when first timer would have fired
      await vi.advanceTimersByTimeAsync(2000)

      // Only the second process should get SIGKILL, not the first
      expect(secondKillSpy).toHaveBeenCalledWith('SIGKILL')
      expect(firstKillSpy).toHaveBeenCalledTimes(1) // Only SIGTERM, no SIGKILL
    })

    it('handles kill errors and attempts force kill as fallback', () => {
      const killSpy = vi.spyOn(mockProcess, 'kill')
      killSpy.mockImplementationOnce(() => {
        throw new Error('Kill failed')
      })
      killSpy.mockImplementationOnce(() => true)

      stopToolhive()

      expect(mockLog.error).toHaveBeenCalledWith(
        '[stopToolhive] Failed to send SIGTERM:',
        expect.any(Error)
      )
      expect(killSpy).toHaveBeenCalledWith('SIGTERM')
      expect(killSpy).toHaveBeenCalledWith('SIGKILL')
    })

    it('clears toolhiveProcess reference after stopping', () => {
      stopToolhive()

      expect(isToolhiveRunning()).toBe(false)
      expect(mockLog.info).toHaveBeenCalledWith(
        '[stopToolhive] Process cleanup completed'
      )
    })

    it('uses captured process reference in timer callback', async () => {
      const killSpy = vi.spyOn(mockProcess, 'kill')
      mockProcess.killed = false

      const capturedProcess = mockProcess

      stopToolhive()

      // Process reference is cleared immediately
      expect(isToolhiveRunning()).toBe(false)

      // But timer should still have access to the process
      await vi.advanceTimersByTimeAsync(2000)

      expect(killSpy).toHaveBeenCalledWith('SIGKILL')
      expect(capturedProcess.killed).toBe(false) // Our mock doesn't auto-set this
    })
  })

  describe('restartToolhive', () => {
    it('stops existing process and starts a new one', async () => {
      // Start initial process
      const startPromise = startToolhive()
      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      const firstProcess = mockProcess
      const firstKillSpy = vi.spyOn(firstProcess, 'kill')

      vi.clearAllMocks()

      // Create new mock process for restart
      const newMockProcess = new MockProcess()
      mockSpawn.mockReturnValue(
        newMockProcess as unknown as ReturnType<typeof spawn>
      )

      const restartPromise = restartToolhive()
      await vi.advanceTimersByTimeAsync(50)
      await restartPromise

      expect(firstKillSpy).toHaveBeenCalled()
      expect(mockSpawn).toHaveBeenCalled()
      expect(mockLog.info).toHaveBeenCalledWith(
        'ToolHive restarted successfully'
      )
    })

    it('prevents concurrent restarts', async () => {
      const startPromise = startToolhive()
      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      vi.clearAllMocks()

      const newMockProcess = new MockProcess()
      mockSpawn.mockReturnValue(
        newMockProcess as unknown as ReturnType<typeof spawn>
      )

      const restart1 = restartToolhive()
      const restart2 = restartToolhive()

      await vi.advanceTimersByTimeAsync(50)
      await Promise.all([restart1, restart2])

      expect(mockLog.info).toHaveBeenCalledWith(
        'Restart already in progress, skipping...'
      )
    })
  })
})
