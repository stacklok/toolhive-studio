import { QueryClient } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ensureToolhiveRunning } from '../ensure-toolhive-running'

describe('ensureToolhiveRunning', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('resolves when toolhive is running', async () => {
    window.electronAPI.isToolhiveRunning = vi.fn().mockResolvedValue(true)

    await expect(ensureToolhiveRunning(queryClient)).resolves.toBeUndefined()
  })

  it('caches the result in query client', async () => {
    window.electronAPI.isToolhiveRunning = vi.fn().mockResolvedValue(true)

    await ensureToolhiveRunning(queryClient)
    await ensureToolhiveRunning(queryClient)

    expect(window.electronAPI.isToolhiveRunning).toHaveBeenCalledTimes(1)
  })

  it('throws when IPC rejects', async () => {
    window.electronAPI.isToolhiveRunning = vi
      .fn()
      .mockRejectedValue(new Error('IPC failed'))

    await expect(ensureToolhiveRunning(queryClient)).rejects.toThrow(
      'IPC failed'
    )
  })
})
