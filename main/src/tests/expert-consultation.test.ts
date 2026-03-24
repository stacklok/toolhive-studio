import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockReadSetting, mockWriteSetting } = vi.hoisted(() => ({
  mockReadSetting: vi.fn(),
  mockWriteSetting: vi.fn(),
}))

vi.mock('@sentry/electron/main', () => ({
  startSpan: vi.fn((_opts: unknown, cb: (span: unknown) => unknown) =>
    cb({ setStatus: vi.fn(), setAttribute: vi.fn(), setAttributes: vi.fn() })
  ),
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

vi.mock('electron-store', () => ({
  default: vi.fn(function ElectronStore() {
    return { get: vi.fn(), set: vi.fn() }
  }),
}))

import {
  getExpertConsultationState,
  setExpertConsultationSubmitted,
  setExpertConsultationDismissedAt,
} from '../expert-consultation'

describe('expert-consultation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getExpertConsultationState', () => {
    it('returns state from SQLite', () => {
      mockReadSetting
        .mockReturnValueOnce('true')
        .mockReturnValueOnce('2026-01-01T00:00:00.000Z')

      const state = getExpertConsultationState()

      expect(state).toEqual({
        submitted: true,
        dismissedAt: '2026-01-01T00:00:00.000Z',
      })
      expect(mockReadSetting).toHaveBeenCalledWith(
        'expertConsultationSubmitted'
      )
      expect(mockReadSetting).toHaveBeenCalledWith(
        'expertConsultationDismissedAt'
      )
    })

    it('returns defaults when SQLite returns undefined', () => {
      mockReadSetting.mockReturnValue(undefined)

      const state = getExpertConsultationState()

      expect(state).toEqual({ submitted: false, dismissedAt: '' })
    })

    it('returns defaults when SQLite read throws', () => {
      mockReadSetting.mockImplementation(() => {
        throw new Error('DB error')
      })

      const state = getExpertConsultationState()

      expect(state).toEqual({ submitted: false, dismissedAt: '' })
    })
  })

  describe('setExpertConsultationSubmitted', () => {
    it('writes to SQLite', () => {
      setExpertConsultationSubmitted(true)

      expect(mockWriteSetting).toHaveBeenCalledWith(
        'expertConsultationSubmitted',
        'true'
      )
    })

    it('does not throw when SQLite write fails', () => {
      mockWriteSetting.mockImplementation(() => {
        throw new Error('DB write failed')
      })

      expect(() => setExpertConsultationSubmitted(true)).not.toThrow()
    })
  })

  describe('setExpertConsultationDismissedAt', () => {
    it('writes to SQLite', () => {
      const timestamp = '2026-03-18T10:00:00.000Z'
      setExpertConsultationDismissedAt(timestamp)

      expect(mockWriteSetting).toHaveBeenCalledWith(
        'expertConsultationDismissedAt',
        timestamp
      )
    })

    it('does not throw when SQLite write fails', () => {
      mockWriteSetting.mockImplementation(() => {
        throw new Error('DB write failed')
      })

      expect(() =>
        setExpertConsultationDismissedAt('2026-03-18T10:00:00.000Z')
      ).not.toThrow()
    })
  })
})
