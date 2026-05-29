import { describe, it, expect, vi } from 'vitest'

// Spike (issue #2296): prove the renderer derives appDisplayName from the
// synchronous IPC bootstrap (which the main process backs with app.getName()).
const sendSync = vi.fn().mockReturnValue('Stacklok Desktop')

vi.mock('electron', () => ({
  ipcRenderer: {
    sendSync,
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))

describe('appApi.appDisplayName (dynamic derivation spike)', () => {
  it('reads the value returned by the get-app-display-name sync IPC', async () => {
    const { appApi } = await import('../app')

    expect(sendSync).toHaveBeenCalledWith('get-app-display-name')
    expect(appApi.appDisplayName).toBe('Stacklok Desktop')
  })
})
