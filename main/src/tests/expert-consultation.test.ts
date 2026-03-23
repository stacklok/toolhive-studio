import { describe, it, expect, vi, beforeEach } from 'vitest'

const storeDefaults: Record<string, unknown> = {
  expertConsultationSubmitted: false,
  expertConsultationDismissedAt: '',
}

const { mockStoreInstance, mockWriteSetting } = vi.hoisted(() => ({
  mockStoreInstance: {
    get: vi.fn(),
    set: vi.fn(),
  },
  mockWriteSetting: vi.fn(),
}))

vi.mock('@sentry/electron/main', () => ({
  startSpan: vi.fn((_opts: unknown, cb: (span: unknown) => unknown) =>
    cb({ setStatus: vi.fn(), setAttribute: vi.fn(), setAttributes: vi.fn() })
  ),
}))

vi.mock('electron-store', () => ({
  default: vi.fn(function ElectronStore() {
    return mockStoreInstance
  }),
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
  readSetting: vi.fn(),
}))

vi.mock('../feature-flags/flags', () => ({
  getFeatureFlag: vi.fn(() => false),
}))

import {
  getExpertConsultationState,
  setExpertConsultationSubmitted,
  setExpertConsultationDismissedAt,
} from '../expert-consultation'

describe('expert-consultation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreInstance.get.mockImplementation(
      (key: string, defaultValue?: unknown) =>
        defaultValue ?? storeDefaults[key]
    )
  })

  describe('getExpertConsultationState', () => {
    it('returns state from the store', () => {
      mockStoreInstance.get
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('2026-01-01T00:00:00.000Z')

      const state = getExpertConsultationState()

      expect(state).toEqual({
        submitted: true,
        dismissedAt: '2026-01-01T00:00:00.000Z',
      })
      expect(mockStoreInstance.get).toHaveBeenCalledWith(
        'expertConsultationSubmitted'
      )
      expect(mockStoreInstance.get).toHaveBeenCalledWith(
        'expertConsultationDismissedAt'
      )
    })

    it('returns defaults when store is empty', () => {
      const state = getExpertConsultationState()

      expect(state).toEqual({ submitted: false, dismissedAt: '' })
    })
  })

  describe('setExpertConsultationSubmitted', () => {
    it('writes to both electron-store and SQLite', () => {
      setExpertConsultationSubmitted(true)

      expect(mockStoreInstance.set).toHaveBeenCalledWith(
        'expertConsultationSubmitted',
        true
      )
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
      expect(mockStoreInstance.set).toHaveBeenCalledWith(
        'expertConsultationSubmitted',
        true
      )
    })
  })

  describe('setExpertConsultationDismissedAt', () => {
    it('writes to both electron-store and SQLite', () => {
      const timestamp = '2026-03-18T10:00:00.000Z'
      setExpertConsultationDismissedAt(timestamp)

      expect(mockStoreInstance.set).toHaveBeenCalledWith(
        'expertConsultationDismissedAt',
        timestamp
      )
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
