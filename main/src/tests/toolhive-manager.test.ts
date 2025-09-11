import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { app } from 'electron'
import type { Tray } from 'electron'
import { EventEmitter } from 'node:events'
import {
  startToolhive,
  getToolhivePort,
  getToolhiveMcpPort,
  isToolhiveRunning,
  stopToolhive,
} from '../toolhive-manager'
import { updateTrayStatus } from '../system-tray'
import log from '../logger'
import * as Sentry from '@sentry/electron/main'

// Mock dependencies
vi.mock('node:child_process')
vi.mock('node:fs')
vi.mock('node:net')
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn().mockReturnValue('/test/userData'),
  },
}))
vi.mock('../system-tray')
vi.mock('../logger')
vi.mock('@sentry/electron/main', () => ({
  captureMessage: vi.fn(),
}))

const mockSpawn = vi.mocked(spawn)
const mockExistsSync = vi.mocked(existsSync)
const mockNet = vi.mocked(net)
const mockApp = vi.mocked(app)
const mockUpdateTrayStatus = vi.mocked(updateTrayStatus)
const mockLog = vi.mocked(log)
const mockCaptureMessage = vi.mocked(Sentry.captureMessage)

// Mock process for testing
class MockProcess extends EventEmitter {
  pid = 12345
  killed = false

  kill() {
    this.killed = true
    this.emit('exit', 0)
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
  let mockTray: Tray

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Reset module state
    stopToolhive()

    // Setup mocks
    mockProcess = new MockProcess()
    mockTray = {} as Tray

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
          stdio: 'ignore',
          detached: false,
        }
      )

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting ToolHive from:')
      )
      expect(isToolhiveRunning()).toBe(true)
      expect(getToolhivePort()).toBeTypeOf('number')
      expect(getToolhiveMcpPort()).toBeTypeOf('number')
    })

    it('updates tray status when tray is provided', async () => {
      const startPromise = startToolhive(mockTray)

      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      expect(mockUpdateTrayStatus).toHaveBeenCalledWith(mockTray, true)
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
      const startPromise = startToolhive(mockTray)

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
        'error'
      )
      expect(mockUpdateTrayStatus).toHaveBeenCalledWith(mockTray, false)
    })

    it('handles process exit events', async () => {
      const startPromise = startToolhive(mockTray)

      await vi.advanceTimersByTimeAsync(50)
      await startPromise

      mockProcess.emit('exit', 1)

      expect(mockLog.warn).toHaveBeenCalledWith(
        'ToolHive process exited with code: 1'
      )
      expect(mockUpdateTrayStatus).toHaveBeenCalledWith(mockTray, false)
      expect(isToolhiveRunning()).toBe(false)
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
          stdio: 'ignore',
          detached: false,
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
})
