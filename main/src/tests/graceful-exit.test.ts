import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as sdkGen from '@common/api/generated/sdk.gen'
import * as clientGen from '@common/api/generated/client'
import * as headers from '../headers'
import * as logger from '../logger'
import * as delay from '../../../utils/delay'
import type {
  GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload,
  PkgApiV1WorkloadListResponse as V1WorkloadListResponse,
} from '@common/api/generated/types.gen'

const {
  mockWriteShutdownServers,
  mockReadShutdownServers,
  mockClearShutdownServersFromDb,
} = vi.hoisted(() => ({
  mockWriteShutdownServers: vi.fn(),
  mockReadShutdownServers: vi.fn(() => [] as unknown[]),
  mockClearShutdownServersFromDb: vi.fn(),
}))

vi.mock('@sentry/electron/main', () => ({
  startSpan: vi.fn((_opts: unknown, cb: (span: unknown) => unknown) =>
    cb({ setStatus: vi.fn(), setAttribute: vi.fn(), setAttributes: vi.fn() })
  ),
}))

vi.mock('@common/api/generated/sdk.gen')
vi.mock('@common/api/generated/client')
vi.mock('../headers')
vi.mock('../logger')
vi.mock('../../../utils/delay')
vi.mock('electron-store', () => ({
  default: vi.fn(function ElectronStore() {
    return { get: vi.fn(), set: vi.fn() }
  }),
}))
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
  },
}))

vi.mock('../db/writers/shutdown-writer', () => ({
  writeShutdownServers: mockWriteShutdownServers,
  clearShutdownServersFromDb: mockClearShutdownServersFromDb,
}))

vi.mock('../db/readers/shutdown-reader', () => ({
  readShutdownServers: mockReadShutdownServers,
}))

import {
  stopAllServers,
  getLastShutdownServers,
  clearShutdownHistory,
} from '../graceful-exit'

const mockGetApiV1BetaWorkloads = vi.mocked(sdkGen.getApiV1BetaWorkloads)
const mockPostApiV1BetaWorkloadsStop = vi.mocked(
  sdkGen.postApiV1BetaWorkloadsStop
)
const mockCreateClient = vi.mocked(clientGen.createClient)
const mockGetHeaders = vi.mocked(headers.getHeaders)
const mockLog = vi.mocked(logger.default)
const mockDelay = vi.mocked(delay.delay)

describe('graceful-exit', () => {
  const mockClient = {} as ReturnType<typeof clientGen.createClient>
  const mockHeaders = {
    'X-Client-Type': 'test',
    'X-Client-Version': '1.0.0',
    'X-Client-Platform': 'darwin' as NodeJS.Platform,
    'X-Client-Release-Build': false,
  }

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

      await stopAllServers('', { port: 3000 })

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

      await stopAllServers('', { port: 3000 })

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

      await stopAllServers('', { port: 3000 })

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

      await expect(stopAllServers('', { port: 3000 })).rejects.toThrow(
        'Stop failed'
      )
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

      await expect(stopAllServers('', { port: 3000 })).rejects.toThrow(
        'Some servers failed to stop within timeout'
      )
    })

    it('writes shutdown servers to SQLite', async () => {
      mockGetApiV1BetaWorkloads
        .mockResolvedValueOnce(createMockWorkloadsResponse(mockRunningServers))
        .mockResolvedValueOnce(createMockWorkloadsResponse(mockStoppedServers))

      mockPostApiV1BetaWorkloadsStop.mockResolvedValue(createMockStopResponse())

      await stopAllServers('', { port: 3000 })

      expect(mockWriteShutdownServers).toHaveBeenCalledWith(mockRunningServers)
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

      await stopAllServers('', { port: 3000 })

      // Should only include the server with a name in the batch call
      expect(mockPostApiV1BetaWorkloadsStop).toHaveBeenCalledTimes(1)
      expect(mockPostApiV1BetaWorkloadsStop).toHaveBeenCalledWith({
        client: mockClient,
        body: { names: ['server2'] },
      })
    })
  })

  describe('getLastShutdownServers', () => {
    it('returns servers from SQLite', () => {
      const mockServers: CoreWorkload[] = [
        { name: 'server1', status: 'running', port: 3001 },
        { name: 'server2', status: 'running', port: 3002 },
      ]
      mockReadShutdownServers.mockReturnValue(mockServers)

      const result = getLastShutdownServers()

      expect(result).toEqual(mockServers)
      expect(mockReadShutdownServers).toHaveBeenCalled()
    })

    it('returns empty array when SQLite read throws', () => {
      mockReadShutdownServers.mockImplementation(() => {
        throw new Error('DB error')
      })

      const result = getLastShutdownServers()

      expect(result).toEqual([])
    })
  })

  describe('clearShutdownHistory', () => {
    it('clears shutdown history in SQLite', () => {
      clearShutdownHistory()

      expect(mockClearShutdownServersFromDb).toHaveBeenCalled()
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

      await stopAllServers('', { port: 3000 })

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

      await stopAllServers('', { port: 3000 })

      // Should call delay between polling attempts (not on first attempt)
      expect(mockDelay).toHaveBeenCalledWith(2000)
    })
  })

  // The new socket transport calls stopAllServers with a `createFetch` factory
  // instead of a `port`. The client's baseUrl becomes the sentinel
  // 'http://localhost' and the custom fetch handles routing to the UNIX socket.
  describe('socket transport (createFetch branch)', () => {
    const mockRunningServers: CoreWorkload[] = [
      { name: 'server1', status: 'running', port: 3001 },
    ]
    const mockStoppedServers: CoreWorkload[] = [
      { name: 'server1', status: 'stopped', port: 3001 },
    ]

    it('passes a sentinel baseUrl (no port) and the produced custom fetch to createClient', async () => {
      mockGetApiV1BetaWorkloads.mockResolvedValue(
        createMockWorkloadsResponse([])
      )

      const customFetch = vi.fn() as unknown as typeof fetch
      const createFetch = vi.fn(() => customFetch)

      await stopAllServers('', { createFetch })

      expect(createFetch).toHaveBeenCalledTimes(1)
      expect(mockCreateClient).toHaveBeenCalledWith({
        baseUrl: 'http://localhost',
        headers: mockHeaders,
        fetch: customFetch,
      })
    })

    it('falls back to http://localhost (no port, no fetch) when neither is provided', async () => {
      mockGetApiV1BetaWorkloads.mockResolvedValue(
        createMockWorkloadsResponse([])
      )

      await stopAllServers('', {})

      const cfg = mockCreateClient.mock.calls.at(-1)?.[0] as {
        baseUrl: string
        fetch?: unknown
      }
      expect(cfg.baseUrl).toBe('http://localhost')
      expect(cfg.fetch).toBeUndefined()
    })

    it('uses the port baseUrl when both port and createFetch are provided, but the custom fetch overrides transport', async () => {
      mockGetApiV1BetaWorkloads.mockResolvedValue(
        createMockWorkloadsResponse([])
      )

      const customFetch = vi.fn() as unknown as typeof fetch
      const createFetch = vi.fn(() => customFetch)

      await stopAllServers('', { port: 3000, createFetch })

      const cfg = mockCreateClient.mock.calls.at(-1)?.[0] as {
        baseUrl: string
        fetch?: unknown
      }
      expect(cfg.baseUrl).toBe('http://localhost:3000')
      expect(cfg.fetch).toBe(customFetch)
    })

    it('completes the no-running-servers fast path when using createFetch', async () => {
      mockGetApiV1BetaWorkloads.mockResolvedValue(
        createMockWorkloadsResponse([])
      )

      const customFetch = vi.fn() as unknown as typeof fetch
      await expect(
        stopAllServers('', { createFetch: () => customFetch })
      ).resolves.toBeUndefined()

      expect(mockPostApiV1BetaWorkloadsStop).not.toHaveBeenCalled()
      expect(mockLog.info).toHaveBeenCalledWith(
        'No running servers – teardown complete'
      )
    })

    it('completes the polling loop when using createFetch', async () => {
      mockGetApiV1BetaWorkloads
        .mockResolvedValueOnce(createMockWorkloadsResponse(mockRunningServers))
        .mockResolvedValueOnce(createMockWorkloadsResponse(mockStoppedServers))
      mockPostApiV1BetaWorkloadsStop.mockResolvedValue(createMockStopResponse())

      const customFetch = vi.fn() as unknown as typeof fetch
      await stopAllServers('', { createFetch: () => customFetch })

      expect(mockPostApiV1BetaWorkloadsStop).toHaveBeenCalledTimes(1)
      expect(mockPostApiV1BetaWorkloadsStop).toHaveBeenCalledWith({
        client: mockClient,
        body: { names: ['server1'] },
      })
      expect(mockLog.info).toHaveBeenCalledWith('All servers stopped cleanly')
    })
  })
})
