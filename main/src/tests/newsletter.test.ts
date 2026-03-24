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
  getNewsletterState,
  setNewsletterSubscribed,
  setNewsletterDismissedAt,
} from '../newsletter'

describe('newsletter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNewsletterState', () => {
    it('returns state from SQLite', () => {
      mockReadSetting
        .mockReturnValueOnce('true')
        .mockReturnValueOnce('2026-01-01T00:00:00.000Z')

      const state = getNewsletterState()

      expect(state).toEqual({
        subscribed: true,
        dismissedAt: '2026-01-01T00:00:00.000Z',
      })
      expect(mockReadSetting).toHaveBeenCalledWith('newsletterSubscribed')
      expect(mockReadSetting).toHaveBeenCalledWith('newsletterDismissedAt')
    })

    it('returns defaults when SQLite returns undefined', () => {
      mockReadSetting.mockReturnValue(undefined)

      const state = getNewsletterState()

      expect(state).toEqual({ subscribed: false, dismissedAt: '' })
    })

    it('returns defaults when SQLite read throws', () => {
      mockReadSetting.mockImplementation(() => {
        throw new Error('DB error')
      })

      const state = getNewsletterState()

      expect(state).toEqual({ subscribed: false, dismissedAt: '' })
    })
  })

  describe('setNewsletterSubscribed', () => {
    it('writes to SQLite', () => {
      setNewsletterSubscribed(true)

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
    })
  })

  describe('setNewsletterDismissedAt', () => {
    it('writes to SQLite', () => {
      const timestamp = '2026-03-18T10:00:00.000Z'
      setNewsletterDismissedAt(timestamp)

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
