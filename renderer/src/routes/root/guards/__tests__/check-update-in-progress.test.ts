import { describe, it, expect, vi } from 'vitest'
import { checkUpdateInProgress } from '../check-update-in-progress'

describe('checkUpdateInProgress', () => {
  it('returns true when an update is in progress', async () => {
    window.electronAPI.isUpdateInProgress = vi.fn().mockResolvedValue(true)

    expect(await checkUpdateInProgress()).toBe(true)
  })

  it('returns false when no update is in progress', async () => {
    window.electronAPI.isUpdateInProgress = vi.fn().mockResolvedValue(false)

    expect(await checkUpdateInProgress()).toBe(false)
  })

  it('returns false when IPC call is not available', async () => {
    window.electronAPI.isUpdateInProgress = vi
      .fn()
      .mockRejectedValue(new Error('IPC not available'))

    expect(await checkUpdateInProgress()).toBe(false)
  })
})
