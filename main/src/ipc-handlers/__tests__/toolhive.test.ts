import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

vi.mock('../../toolhive-manager', () => ({
  restartToolhive: vi.fn(),
  getToolhiveSocketPath: vi.fn(),
  isToolhiveRunning: vi.fn(),
  getToolhiveStatus: vi.fn(),
  isUsingCustomSocket: vi.fn(),
}))

vi.mock('../../container-engine', () => ({
  checkContainerEngine: vi.fn(),
}))

vi.mock('../../graceful-exit', () => ({
  getLastShutdownServers: vi.fn(),
  clearShutdownHistory: vi.fn(),
}))

vi.mock('../../unix-socket-fetch', () => ({
  registerApiFetchHandlers: vi.fn(),
}))

vi.mock('../../logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { ipcMain } from 'electron'
import {
  restartToolhive,
  getToolhiveSocketPath,
  isToolhiveRunning,
  getToolhiveStatus,
  isUsingCustomSocket,
} from '../../toolhive-manager'
import { checkContainerEngine } from '../../container-engine'
import {
  getLastShutdownServers,
  clearShutdownHistory,
} from '../../graceful-exit'
import { registerApiFetchHandlers } from '../../unix-socket-fetch'
import log from '../../logger'
import { register } from '../toolhive'

const mockHandle = vi.mocked(ipcMain.handle)
const mockRegisterApiFetchHandlers = vi.mocked(registerApiFetchHandlers)
const mockRestartToolhive = vi.mocked(restartToolhive)
const mockGetSocketPath = vi.mocked(getToolhiveSocketPath)
const mockIsRunning = vi.mocked(isToolhiveRunning)
const mockGetStatus = vi.mocked(getToolhiveStatus)
const mockIsUsingCustomSocket = vi.mocked(isUsingCustomSocket)
const mockCheckContainerEngine = vi.mocked(checkContainerEngine)
const mockGetLastShutdownServers = vi.mocked(getLastShutdownServers)
const mockClearShutdownHistory = vi.mocked(clearShutdownHistory)
const mockLogError = vi.mocked(log.error)

type Handler = (event: unknown, ...args: unknown[]) => unknown

function getHandler(channel: string): Handler {
  const call = mockHandle.mock.calls.find(([c]) => c === channel)
  if (!call) throw new Error(`handler for ${channel} not registered`)
  return call[1] as Handler
}

describe('ipc-handlers/toolhive register()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers exactly the expected channel set', () => {
    register()

    const channels = mockHandle.mock.calls.map(([c]) => c)
    expect(channels.sort()).toEqual(
      [
        'get-toolhive-socket-path',
        'is-toolhive-running',
        'get-toolhive-status',
        'is-using-custom-socket',
        'check-container-engine',
        'restart-toolhive',
        'shutdown-store:get-last-servers',
        'shutdown-store:clear-history',
      ].sort()
    )
  })

  it('wires registerApiFetchHandlers exactly once', () => {
    register()

    expect(mockRegisterApiFetchHandlers).toHaveBeenCalledTimes(1)
  })

  it('get-toolhive-socket-path returns the value from the manager', () => {
    mockGetSocketPath.mockReturnValue('/tmp/foo.sock')
    register()

    expect(getHandler('get-toolhive-socket-path')({})).toBe('/tmp/foo.sock')
  })

  it('is-toolhive-running returns the value from the manager', () => {
    mockIsRunning.mockReturnValue(true)
    register()

    expect(getHandler('is-toolhive-running')({})).toBe(true)
  })

  it('get-toolhive-status returns the value from the manager', () => {
    const status = { isRunning: true } as unknown as ReturnType<
      typeof getToolhiveStatus
    >
    mockGetStatus.mockReturnValue(status)
    register()

    expect(getHandler('get-toolhive-status')({})).toBe(status)
  })

  it('is-using-custom-socket returns the value from the manager', () => {
    mockIsUsingCustomSocket.mockReturnValue(true)
    register()

    expect(getHandler('is-using-custom-socket')({})).toBe(true)

    mockIsUsingCustomSocket.mockReturnValue(false)
    expect(getHandler('is-using-custom-socket')({})).toBe(false)
  })

  it('check-container-engine resolves with the engine result', async () => {
    const result = {
      available: true,
      docker: true,
      podman: false,
      rancherDesktop: false,
    }
    mockCheckContainerEngine.mockResolvedValue(result)
    register()

    await expect(getHandler('check-container-engine')({})).resolves.toEqual(
      result
    )
  })

  it('restart-toolhive resolves { success: true } on success', async () => {
    mockRestartToolhive.mockResolvedValue(undefined)
    register()

    await expect(getHandler('restart-toolhive')({})).resolves.toEqual({
      success: true,
    })
  })

  it('restart-toolhive resolves { success: false, error } on rejection and logs', async () => {
    mockRestartToolhive.mockRejectedValue(new Error('boom'))
    register()

    await expect(getHandler('restart-toolhive')({})).resolves.toEqual({
      success: false,
      error: 'boom',
    })
    expect(mockLogError).toHaveBeenCalledWith(
      'Failed to restart ToolHive: ',
      expect.any(Error)
    )
  })

  it('restart-toolhive returns "Unknown error" when rejection is not an Error', async () => {
    mockRestartToolhive.mockRejectedValue('plain string')
    register()

    await expect(getHandler('restart-toolhive')({})).resolves.toEqual({
      success: false,
      error: 'Unknown error',
    })
  })

  it('shutdown-store:get-last-servers returns the workloads from graceful-exit', () => {
    const workloads = [{ name: 'srv', status: 'running' as const }]
    mockGetLastShutdownServers.mockReturnValue(
      workloads as unknown as ReturnType<typeof getLastShutdownServers>
    )
    register()

    expect(getHandler('shutdown-store:get-last-servers')({})).toEqual(workloads)
  })

  it('shutdown-store:clear-history calls clearShutdownHistory and returns success', () => {
    register()

    const result = getHandler('shutdown-store:clear-history')({})

    expect(mockClearShutdownHistory).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ success: true })
  })
})
