import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist mocks so they're available before module evaluation
const { mockStoreInstance, mockShowMessageBox } = vi.hoisted(() => ({
  mockStoreInstance: {
    get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue ?? false),
    set: vi.fn(),
  },
  mockShowMessageBox: vi.fn(),
}))

vi.mock('electron-store', () => ({
  default: vi.fn(function ElectronStore() {
    return mockStoreInstance
  }),
}))

vi.mock('electron', () => ({
  dialog: {
    showMessageBox: mockShowMessageBox,
  },
}))

vi.mock('../logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  getSkipQuitConfirmation,
  setSkipQuitConfirmation,
  showNativeQuitConfirmation,
} from '../quit-confirmation'

describe('quit-confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSkipQuitConfirmation', () => {
    it('returns the stored value', () => {
      mockStoreInstance.get.mockReturnValue(true)

      expect(getSkipQuitConfirmation()).toBe(true)
      expect(mockStoreInstance.get).toHaveBeenCalledWith('skipQuitConfirmation')
    })
  })

  describe('setSkipQuitConfirmation', () => {
    it('persists the preference', () => {
      setSkipQuitConfirmation(true)

      expect(mockStoreInstance.set).toHaveBeenCalledWith(
        'skipQuitConfirmation',
        true
      )
    })
  })

  describe('showNativeQuitConfirmation', () => {
    it('returns true immediately when skipQuitConfirmation is set', async () => {
      mockStoreInstance.get.mockReturnValue(true)

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(true)
      expect(mockShowMessageBox).not.toHaveBeenCalled()
    })

    it('shows dialog and returns true when user clicks Quit', async () => {
      mockStoreInstance.get.mockReturnValue(false)
      mockShowMessageBox.mockResolvedValue({
        response: 0,
        checkboxChecked: false,
      })

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(true)
      expect(mockShowMessageBox).toHaveBeenCalledOnce()
    })

    it('shows dialog and returns false when user clicks Cancel', async () => {
      mockStoreInstance.get.mockReturnValue(false)
      mockShowMessageBox.mockResolvedValue({
        response: 1,
        checkboxChecked: false,
      })

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(false)
      expect(mockShowMessageBox).toHaveBeenCalledOnce()
    })

    it('persists preference when checkbox is checked and user confirms', async () => {
      mockStoreInstance.get.mockReturnValue(false)
      mockShowMessageBox.mockResolvedValue({
        response: 0,
        checkboxChecked: true,
      })

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(true)
      expect(mockStoreInstance.set).toHaveBeenCalledWith(
        'skipQuitConfirmation',
        true
      )
    })

    it('does not persist preference when checkbox is checked but user cancels', async () => {
      mockStoreInstance.get.mockReturnValue(false)
      mockShowMessageBox.mockResolvedValue({
        response: 1,
        checkboxChecked: true,
      })

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(false)
      expect(mockStoreInstance.set).not.toHaveBeenCalled()
    })

    it('returns true (fail open) when dialog.showMessageBox rejects', async () => {
      mockStoreInstance.get.mockReturnValue(false)
      mockShowMessageBox.mockRejectedValue(new Error('Dialog failed'))

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(true)
    })
  })
})
