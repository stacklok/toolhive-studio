import { describe, it, expect, vi, beforeEach } from 'vitest'

const storeDefaults: Record<string, unknown> = {
  newsletterSubscribed: false,
  newsletterDismissedAt: '',
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
  getNewsletterState,
  setNewsletterSubscribed,
  setNewsletterDismissedAt,
} from '../newsletter'

describe('newsletter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStoreInstance.get.mockImplementation(
      (key: string, defaultValue?: unknown) =>
        defaultValue ?? storeDefaults[key]
    )
  })

  describe('getNewsletterState', () => {
    it('returns state from the store', () => {
      mockStoreInstance.get
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('2026-01-01T00:00:00.000Z')

      const state = getNewsletterState()

      expect(state).toEqual({
        subscribed: true,
        dismissedAt: '2026-01-01T00:00:00.000Z',
      })
      expect(mockStoreInstance.get).toHaveBeenCalledWith('newsletterSubscribed')
      expect(mockStoreInstance.get).toHaveBeenCalledWith(
        'newsletterDismissedAt'
      )
    })

    it('returns defaults when store is empty', () => {
      const state = getNewsletterState()

      expect(state).toEqual({ subscribed: false, dismissedAt: '' })
    })
  })

  describe('setNewsletterSubscribed', () => {
    it('writes to both electron-store and SQLite', () => {
      setNewsletterSubscribed(true)

      expect(mockStoreInstance.set).toHaveBeenCalledWith(
        'newsletterSubscribed',
        true
      )
      expect(mockWriteSetting).toHaveBeenCalledWith(
        'newsletterSubscribed',
        'true'
      )
    })

    it('does not throw when SQLite write fails', () => {
      mockWriteSetting.mockImplementation(() => {
        throw new Error('DB write failed')
      })

      expect(() => setNewsletterSubscribed(true)).not.toThrow()
      expect(mockStoreInstance.set).toHaveBeenCalledWith(
        'newsletterSubscribed',
        true
      )
    })
  })

  describe('setNewsletterDismissedAt', () => {
    it('writes to both electron-store and SQLite', () => {
      const timestamp = '2026-03-18T10:00:00.000Z'
      setNewsletterDismissedAt(timestamp)

      expect(mockStoreInstance.set).toHaveBeenCalledWith(
        'newsletterDismissedAt',
        timestamp
      )
      expect(mockWriteSetting).toHaveBeenCalledWith(
        'newsletterDismissedAt',
        timestamp
      )
    })

    it('does not throw when SQLite write fails', () => {
      mockWriteSetting.mockImplementation(() => {
        throw new Error('DB write failed')
      })

      expect(() =>
        setNewsletterDismissedAt('2026-03-18T10:00:00.000Z')
      ).not.toThrow()
    })
  })
})
