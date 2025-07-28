import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pollServerStatus, pollServerDelete } from '../polling'
import type { WorkloadsWorkload } from '@api/types.gen'

describe('Polling Utility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('pollServerStatus', () => {
    it('returns true when server reaches desired status', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValueOnce({ status: 'starting' } as WorkloadsWorkload)
        .mockResolvedValueOnce({ status: 'running' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 3,
        intervalMs: 100,
      })

      await vi.advanceTimersByTimeAsync(250)

      const result = await pollPromise
      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(2)
    })

    it('returns false when server never reaches desired status', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValue({ status: 'starting' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 3,
        intervalMs: 100,
      })

      await vi.advanceTimersByTimeAsync(500)

      const result = await pollPromise
      expect(result).toBe(false)
      expect(mockFetchServer).toHaveBeenCalledTimes(3)
    })

    it('handles fetch errors and continue polling', async () => {
      const mockFetchServer = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 'running' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 3,
        intervalMs: 100,
      })

      await vi.advanceTimersByTimeAsync(250)

      const result = await pollPromise
      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(2)
    })

    it('returns true immediately if first attempt matches', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValueOnce({ status: 'running' } as WorkloadsWorkload)

      const result = await pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 3,
        intervalMs: 100,
      })

      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(1)
    })

    it('works with different status values', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValueOnce({ status: 'starting' } as WorkloadsWorkload)
        .mockResolvedValueOnce({ status: 'stopped' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'stopped', {
        maxAttempts: 3,
        intervalMs: 100,
      })

      await vi.advanceTimersByTimeAsync(250)

      const result = await pollPromise
      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(2)
    })

    it('respects custom configuration', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValue({ status: 'starting' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 2,
        intervalMs: 200,
      })

      await vi.advanceTimersByTimeAsync(500)

      const result = await pollPromise
      expect(result).toBe(false)
      expect(mockFetchServer).toHaveBeenCalledTimes(2)
    })
  })

  describe('pollServerDelete', () => {
    it('returns true when server fetch fails (server deleted)', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValueOnce({ status: 'running' } as WorkloadsWorkload)
        .mockRejectedValueOnce(new Error('Not found'))

      const pollPromise = pollServerDelete(mockFetchServer, {
        maxAttempts: 3,
        intervalMs: 100,
      })

      await vi.advanceTimersByTimeAsync(250)

      const result = await pollPromise
      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(2)
    })

    it('returns true immediately if first attempt fails', async () => {
      const mockFetchServer = vi
        .fn()
        .mockRejectedValueOnce(new Error('Not found'))

      const result = await pollServerDelete(mockFetchServer, {
        maxAttempts: 3,
        intervalMs: 100,
      })

      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(1)
    })

    it('returns false if server never gets deleted', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValue({ status: 'running' } as WorkloadsWorkload)

      const pollPromise = pollServerDelete(mockFetchServer, {
        maxAttempts: 3,
        intervalMs: 100,
      })

      await vi.advanceTimersByTimeAsync(500)

      const result = await pollPromise
      expect(result).toBe(false)
      expect(mockFetchServer).toHaveBeenCalledTimes(3)
    })

    it('handles mixed scenarios (running then deleted)', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValueOnce({ status: 'running' } as WorkloadsWorkload)
        .mockResolvedValueOnce({ status: 'stopping' } as WorkloadsWorkload)
        .mockRejectedValueOnce(new Error('Not found'))

      const pollPromise = pollServerDelete(mockFetchServer, {
        maxAttempts: 5,
        intervalMs: 100,
      })

      await vi.advanceTimersByTimeAsync(400)

      const result = await pollPromise
      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(3)
    })
  })

  describe('Configuration Options', () => {
    it('respects delayFirst option', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValue({ status: 'running' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 1,
        intervalMs: 100,
        delayFirst: true,
      })

      await vi.advanceTimersByTimeAsync(150)
      await pollPromise

      expect(mockFetchServer).toHaveBeenCalledTimes(1)
    })

    it('uses default configuration when none provided', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValue({ status: 'running' } as WorkloadsWorkload)

      const result = await pollServerStatus(mockFetchServer, 'running')

      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined server data', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValueOnce(undefined as unknown as WorkloadsWorkload)
        .mockResolvedValueOnce({ status: 'running' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 3,
        intervalMs: 100,
      })

      await vi.advanceTimersByTimeAsync(250)

      const result = await pollPromise
      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(2)
    })

    it('handles null server data', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValueOnce(null as unknown as WorkloadsWorkload)
        .mockResolvedValueOnce({ status: 'running' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 3,
        intervalMs: 100,
      })

      await vi.advanceTimersByTimeAsync(250)

      const result = await pollPromise
      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(2)
    })

    it('handles server with missing status', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValueOnce({} as WorkloadsWorkload)
        .mockResolvedValueOnce({ status: 'running' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 3,
        intervalMs: 100,
      })

      await vi.advanceTimersByTimeAsync(250)

      const result = await pollPromise
      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(2)
    })

    it('handles zero maxAttempts', async () => {
      const mockFetchServer = vi.fn()

      const result = await pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 0,
        intervalMs: 100,
      })

      expect(result).toBe(false)
      expect(mockFetchServer).not.toHaveBeenCalled()
    })
  })

  describe('Performance and Timing', () => {
    it('does not delay before first attempt by default', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValue({ status: 'running' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 1,
        intervalMs: 1000, // Long interval to test no initial delay
      })

      // Should complete immediately without waiting for interval
      const result = await pollPromise
      expect(result).toBe(true)
      expect(mockFetchServer).toHaveBeenCalledTimes(1)
    })

    it('respects interval timing between attempts', async () => {
      const mockFetchServer = vi
        .fn()
        .mockResolvedValueOnce({ status: 'starting' } as WorkloadsWorkload)
        .mockResolvedValueOnce({ status: 'running' } as WorkloadsWorkload)

      const pollPromise = pollServerStatus(mockFetchServer, 'running', {
        maxAttempts: 3,
        intervalMs: 100,
      })

      // First call should happen immediately
      await vi.advanceTimersByTimeAsync(0)
      expect(mockFetchServer).toHaveBeenCalledTimes(1)

      // Second call should happen after interval
      await vi.advanceTimersByTimeAsync(100)
      await pollPromise
      expect(mockFetchServer).toHaveBeenCalledTimes(2)
    })
  })
})
