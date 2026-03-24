import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockReadSetting, mockWriteSetting, mockShowMessageBox } = vi.hoisted(
  () => ({
    mockReadSetting: vi.fn(),
    mockWriteSetting: vi.fn(),
    mockShowMessageBox: vi.fn(),
  })
)

vi.mock('@sentry/electron/main', () => ({
  startSpan: vi.fn((_opts: unknown, cb: (span: unknown) => unknown) =>
    cb({ setStatus: vi.fn(), setAttribute: vi.fn(), setAttributes: vi.fn() })
  ),
}))

vi.mock('electron-store', () => ({
  default: vi.fn(function ElectronStore() {
    return { get: vi.fn(), set: vi.fn() }
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

vi.mock('../db/writers/settings-writer', () => ({
  writeSetting: mockWriteSetting,
}))

vi.mock('../db/readers/settings-reader', () => ({
  readSetting: mockReadSetting,
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
    it('returns true when SQLite has the value set', () => {
      mockReadSetting.mockReturnValue('true')

      expect(getSkipQuitConfirmation()).toBe(true)
      expect(mockReadSetting).toHaveBeenCalledWith('skipQuitConfirmation')
    })

    it('returns false when SQLite returns undefined', () => {
      mockReadSetting.mockReturnValue(undefined)

      expect(getSkipQuitConfirmation()).toBe(false)
    })

    it('returns false when SQLite read throws', () => {
      mockReadSetting.mockImplementation(() => {
        throw new Error('DB error')
      })

      expect(getSkipQuitConfirmation()).toBe(false)
    })
  })

  describe('setSkipQuitConfirmation', () => {
    it('persists the preference to SQLite', () => {
      setSkipQuitConfirmation(true)

      expect(mockWriteSetting).toHaveBeenCalledWith(
        'skipQuitConfirmation',
        'true'
      )
    })

    it('does not throw when SQLite write fails', () => {
      mockWriteSetting.mockImplementation(() => {
        throw new Error('DB write failed')
      })

      expect(() => setSkipQuitConfirmation(true)).not.toThrow()
    })
  })

  describe('showNativeQuitConfirmation', () => {
    it('returns true immediately when skipQuitConfirmation is set', async () => {
      mockReadSetting.mockReturnValue('true')

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(true)
      expect(mockShowMessageBox).not.toHaveBeenCalled()
    })

    it('shows dialog and returns true when user clicks Quit', async () => {
      mockReadSetting.mockReturnValue(undefined)
      mockShowMessageBox.mockResolvedValue({
        response: 0,
        checkboxChecked: false,
      })

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(true)
      expect(mockShowMessageBox).toHaveBeenCalledOnce()
    })

    it('shows dialog and returns false when user clicks Cancel', async () => {
      mockReadSetting.mockReturnValue(undefined)
      mockShowMessageBox.mockResolvedValue({
        response: 1,
        checkboxChecked: false,
      })

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(false)
      expect(mockShowMessageBox).toHaveBeenCalledOnce()
    })

    it('persists preference when checkbox is checked and user confirms', async () => {
      mockReadSetting.mockReturnValue(undefined)
      mockShowMessageBox.mockResolvedValue({
        response: 0,
        checkboxChecked: true,
      })

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(true)
      expect(mockWriteSetting).toHaveBeenCalledWith(
        'skipQuitConfirmation',
        'true'
      )
    })

    it('does not persist preference when checkbox is checked but user cancels', async () => {
      mockReadSetting.mockReturnValue(undefined)
      mockShowMessageBox.mockResolvedValue({
        response: 1,
        checkboxChecked: true,
      })

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(false)
      expect(mockWriteSetting).not.toHaveBeenCalled()
    })

    it('returns true (fail open) when dialog.showMessageBox rejects', async () => {
      mockReadSetting.mockReturnValue(undefined)
      mockShowMessageBox.mockRejectedValue(new Error('Dialog failed'))

      const result = await showNativeQuitConfirmation()

      expect(result).toBe(true)
    })
  })
})
