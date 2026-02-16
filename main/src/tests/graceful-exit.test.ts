import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  stopAllServers,
  getLastShutdownServers,
  clearShutdownHistory,
} from '../graceful-exit'
import * as sdkGen from '@common/api/generated/sdk.gen'
import * as clientGen from '@common/api/generated/client'
import * as headers from '../headers'
import * as logger from '../logger'
import * as delay from '../../../utils/delay'
import type {
  CoreWorkload,
  V1WorkloadListResponse,
} from '@common/api/generated/types.gen'

// Mock dependencies
vi.mock('@common/api/generated/sdk.gen')
vi.mock('@common/api/generated/client')
vi.mock('../headers')
vi.mock('../logger')
vi.mock('../../../utils/delay')
vi.mock('electron-store')
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

const mockGetApiV1BetaWorkloads = vi.mocked(sdkGen.getApiV1BetaWorkloads)
const mockPostApiV1BetaWorkloadsStop = vi.mocked(
  sdkGen.postApiV1BetaWorkloadsStop
)
const mockCreateClient = vi.mocked(clientGen.createClient)
const mockGetHeaders = vi.mocked(headers.getHeaders)
const mockLog = vi.mocked(logger.default)
const mockDelay = vi.mocked(delay.delay)

// Mock electron-store
vi.mock('electron-store', () => {
  const mockStoreInstance = {
    get: vi.fn(),
    set: vi.fn(),
  }

  // Export the instance so we can access it in tests
  ;(
    globalThis as typeof globalThis & {
      __mockStoreInstance: typeof mockStoreInstance
    }
  ).__mockStoreInstance = mockStoreInstance

  return {
    default: vi.fn(function ElectronStore() {
      return mockStoreInstance
    }),
  }
})

describe('graceful-exit', () => {
  const mockClient = {} as ReturnType<typeof clientGen.createClient>
  const mockHeaders = {
    'X-Client-Type': 'test',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'darwin' as NodeJS.Platform,
    'X-Client-Release-Build': false,
  }

  // Get reference to the mocked store instance
  const mockStoreInstance = (
    globalThis as typeof globalThis & {
      __mockStoreInstance: {
        get: ReturnType<typeof vi.fn>
        set: ReturnType<typeof vi.fn>
      }
    }
  ).__mockStoreInstance

  const createMockWorkloadsResponse = (workloads: CoreWorkload[]) => ({
    data: { workloads } as V1WorkloadListResponse,
    request: {} as Request,
    response: {} as Response,
  })

  const createMockStopResponse = () => ({
    data: '',
    request: {} as Request,
    response: {} as Response,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockReturnValue(mockClient)
    mockGetHeaders.mockReturnValue(mockHeaders)
    mockDelay.mockResolvedValue(undefined)

    // Mock logger methods
    mockLog.info = vi.fn()
    mockLog.error = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('stopAllServers', () => {
    const mockRunningServers: CoreWorkload[] = [
      { name: 'server1', status: 'running', port: 3001 },
      { name: 'server2', status: 'running', port: 3002 },
    ]

    const mockStoppedServers: CoreWorkload[] = [
      { name: 'server1', status: 'stopped', port: 3001 },
      { name: 'server2', status: 'stopped', port: 3002 },
    ]

    it('handles no running servers gracefully', async () => {
      mockGetApiV1BetaWorkloads.mockResolvedValue(
        createMockWorkloadsResponse([])
      )

      await stopAllServers('', 3000)

      expect(mockLog.info).toHaveBeenCalledWith(
        'No running servers – teardown complete'
      )
      expect(mockPostApiV1BetaWorkloadsStop).not.toHaveBeenCalled()
    })

    it('stops all running servers successfully', async () => {
      // Mock getting running servers initially
      mockGetApiV1BetaWorkloads
        .mockResolvedValueOnce(createMockWorkloadsResponse(mockRunningServers))
        // Mock polling - first call shows servers still stopping, second shows stopped
        .mockResolvedValueOnce(
          createMockWorkloadsResponse([
            { name: 'server1', status: 'stopping', port: 3001 },
            { name: 'server2', status: 'stopping', port: 3002 },
          ])
        )
        .mockResolvedValueOnce(createMockWorkloadsResponse(mockStoppedServers))

      mockPostApiV1BetaWorkloadsStop.mockResolvedValue(createMockStopResponse())

      await stopAllServers('', 3000)

      expect(mockPostApiV1BetaWorkloadsStop).toHaveBeenCalledTimes(1)
      expect(mockPostApiV1BetaWorkloadsStop).toHaveBeenCalledWith({
        client: mockClient,
        body: { names: ['server1', 'server2'] },
      })
      expect(mockLog.info).toHaveBeenCalledWith('All servers stopped cleanly')
    })

    it('handles servers with final statuses (error, unknown, unhealthy)', async () => {
      const serversWithFinalStatuses: CoreWorkload[] = [
        { name: 'server1', status: 'error', port: 3001 },
        { name: 'server2', status: 'unknown', port: 3002 },
        { name: 'server3', status: 'unhealthy', port: 3003 },
      ]

      mockGetApiV1BetaWorkloads
        .mockResolvedValueOnce(createMockWorkloadsResponse(mockRunningServers))
        .mockResolvedValueOnce(
          createMockWorkloadsResponse(serversWithFinalStatuses)
        )

      mockPostApiV1BetaWorkloadsStop.mockResolvedValue(createMockStopResponse())

      await stopAllServers('', 3000)

      expect(mockLog.info).toHaveBeenCalledWith(
        'All servers have reached final state'
      )
      expect(mockLog.info).toHaveBeenCalledWith('All servers stopped cleanly')
    })

    it('handles stop command failures', async () => {
      mockGetApiV1BetaWorkloads.mockResolvedValue(
        createMockWorkloadsResponse(mockRunningServers)
      )

      mockPostApiV1BetaWorkloadsStop.mockRejectedValueOnce(
        new Error('Stop failed')
      )

      await expect(stopAllServers('', 3000)).rejects.toThrow('Stop failed')
    })

    it('handles timeout when servers do not stop', async () => {
      const stuckServers: CoreWorkload[] = [
        { name: 'server1', status: 'stopping', port: 3001 },
      ]

      mockGetApiV1BetaWorkloads
        .mockResolvedValueOnce(
          createMockWorkloadsResponse([
            { name: 'server1', status: 'running', port: 3001 },
          ])
        )
        // Keep returning stopping status to simulate timeout
        .mockResolvedValue(createMockWorkloadsResponse(stuckServers))

      mockPostApiV1BetaWorkloadsStop.mockResolvedValue(createMockStopResponse())

      await expect(stopAllServers('', 3000)).rejects.toThrow(
        'Some servers failed to stop within timeout'
      )
    })

    it('stores shutdown servers in electron store', async () => {
      mockGetApiV1BetaWorkloads
        .mockResolvedValueOnce(createMockWorkloadsResponse(mockRunningServers))
        .mockResolvedValueOnce(createMockWorkloadsResponse(mockStoppedServers))

      mockPostApiV1BetaWorkloadsStop.mockResolvedValue(createMockStopResponse())

      await stopAllServers('', 3000)

      expect(mockStoreInstance.set).toHaveBeenCalledWith(
        'lastShutdownServers',
        mockRunningServers
      )
    })

    it('handles servers without names', async () => {
      const serversWithoutNames: CoreWorkload[] = [
        { name: undefined, status: 'running', port: 3001 },
        { name: 'server2', status: 'running', port: 3002 },
      ]

      mockGetApiV1BetaWorkloads
        .mockResolvedValueOnce(createMockWorkloadsResponse(serversWithoutNames))
        .mockResolvedValueOnce(
          createMockWorkloadsResponse([
            { name: 'server2', status: 'stopped', port: 3002 },
          ])
        )

      mockPostApiV1BetaWorkloadsStop.mockResolvedValue(createMockStopResponse())

      await stopAllServers('', 3000)

      // Should only include the server with a name in the batch call
      expect(mockPostApiV1BetaWorkloadsStop).toHaveBeenCalledTimes(1)
      expect(mockPostApiV1BetaWorkloadsStop).toHaveBeenCalledWith({
        client: mockClient,
        body: { names: ['server2'] },
      })
    })
  })

  describe('getLastShutdownServers', () => {
    it('returns servers from electron store', () => {
      const mockServers = ['server1', 'server2']
      mockStoreInstance.get.mockReturnValue(mockServers)

      const result = getLastShutdownServers()

      expect(result).toEqual(mockServers)
      expect(mockStoreInstance.get).toHaveBeenCalledWith(
        'lastShutdownServers',
        []
      )
    })

    it('returns empty array when no servers in store', () => {
      mockStoreInstance.get.mockReturnValue([])

      const result = getLastShutdownServers()

      expect(result).toEqual([])
    })
  })

  describe('clearShutdownHistory', () => {
    it('clears shutdown history in electron store', () => {
      clearShutdownHistory()

      expect(mockStoreInstance.set).toHaveBeenCalledWith(
        'lastShutdownServers',
        []
      )
      expect(mockLog.info).toHaveBeenCalledWith('Shutdown history cleared')
    })
  })

  describe('polling behavior', () => {
    it('logs server status during polling', async () => {
      const runningServer: CoreWorkload[] = [
        { name: 'server1', status: 'running', port: 3001 },
      ]

      const stoppingServer: CoreWorkload[] = [
        { name: 'server1', status: 'stopping', port: 3001 },
      ]

      const stoppedServer: CoreWorkload[] = [
        { name: 'server1', status: 'stopped', port: 3001 },
      ]

      mockGetApiV1BetaWorkloads
        .mockResolvedValueOnce(createMockWorkloadsResponse(runningServer))
        .mockResolvedValueOnce(createMockWorkloadsResponse(stoppingServer))
        .mockResolvedValueOnce(createMockWorkloadsResponse(stoppedServer))

      mockPostApiV1BetaWorkloadsStop.mockResolvedValue(createMockStopResponse())

      await stopAllServers('', 3000)

      expect(mockLog.info).toHaveBeenCalledWith(
        'Still waiting for 1 servers to reach final state: server1(stopping)'
      )
      expect(mockLog.info).toHaveBeenCalledWith(
        'All servers have reached final state'
      )
    })

    it('respects polling intervals', async () => {
      const runningServer: CoreWorkload[] = [
        { name: 'server1', status: 'running', port: 3001 },
      ]

      const stoppedServer: CoreWorkload[] = [
        { name: 'server1', status: 'stopped', port: 3001 },
      ]

      mockGetApiV1BetaWorkloads
        .mockResolvedValueOnce(createMockWorkloadsResponse(runningServer))
        .mockResolvedValueOnce(createMockWorkloadsResponse(runningServer))
        .mockResolvedValueOnce(createMockWorkloadsResponse(stoppedServer))

      mockPostApiV1BetaWorkloadsStop.mockResolvedValue(createMockStopResponse())

      await stopAllServers('', 3000)

      // Should call delay between polling attempts (not on first attempt)
      expect(mockDelay).toHaveBeenCalledWith(2000)
    })
  })
})
