import { describe, it, expect, vi, beforeEach } from 'vitest'
import { featureFlagKeys } from '../../../../utils/feature-flags'

vi.mock('electron-store', () => {
  return {
    default: vi.fn(function ElectronStore() {
      return { get: vi.fn(), set: vi.fn(), delete: vi.fn(), store: {} }
    }),
  }
})

vi.mock('../../logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../db/writers/feature-flags-writer', () => ({
  writeFeatureFlag: vi.fn(),
  deleteFeatureFlag: vi.fn(),
}))

vi.mock('../../db/readers/feature-flags-reader', () => ({
  readFeatureFlag: vi.fn(() => undefined),
}))

// Import after mocks are set up
import {
  getFeatureFlag,
  getAllFeatureFlags,
  enableFeatureFlag,
  disableFeatureFlag,
} from '../flags'
import {
  writeFeatureFlag,
  deleteFeatureFlag,
} from '../../db/writers/feature-flags-writer'
import { readFeatureFlag } from '../../db/readers/feature-flags-reader'

describe('Feature Flags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('featureFlagKeys', () => {
    it('should export all feature flag keys as strings', () => {
      const keys = Object.values(featureFlagKeys)
      expect(keys.length).toBeGreaterThan(0)
      keys.forEach((key) => {
        expect(typeof key).toBe('string')
        expect(key.length).toBeGreaterThan(0)
      })
    })

    it('should have unique values for all keys', () => {
      const values = Object.values(featureFlagKeys)
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).toBe(values.length)
    })
  })

  describe('getFeatureFlag', () => {
    it.each(Object.entries(featureFlagKeys))(
      'should return default value for %s when not stored',
      (_name, key) => {
        const result = getFeatureFlag(key)
        expect(typeof result).toBe('boolean')
      }
    )

    it('should return value from SQLite when available', () => {
      vi.mocked(readFeatureFlag).mockReturnValueOnce(true)

      const result = getFeatureFlag(featureFlagKeys.META_OPTIMIZER)
      expect(result).toBe(true)
    })

    it('should return false (default) when SQLite returns undefined', () => {
      vi.mocked(readFeatureFlag).mockReturnValueOnce(undefined)

      const result = getFeatureFlag(featureFlagKeys.META_OPTIMIZER)
      expect(result).toBe(false)
    })

    it('should return false (default) when SQLite read throws', () => {
      vi.mocked(readFeatureFlag).mockImplementationOnce(() => {
        throw new Error('DB error')
      })

      const result = getFeatureFlag(featureFlagKeys.META_OPTIMIZER)
      expect(result).toBe(false)
    })
  })

  describe('getAllFeatureFlags', () => {
    it('should return all defined feature flags', () => {
      const flags = getAllFeatureFlags()
      const flagKeys = Object.values(featureFlagKeys)

      flagKeys.forEach((key) => {
        expect(flags).toHaveProperty(key)
      })
    })

    it('should return flags with required properties', () => {
      const flags = getAllFeatureFlags()

      Object.values(flags).forEach((flag) => {
        expect(flag).toHaveProperty('enabled')
        expect(typeof flag.enabled).toBe('boolean')
        if (flag.isDisabled !== undefined) {
          expect(typeof flag.isDisabled).toBe('boolean')
        }
        if (flag.defaultValue !== undefined) {
          expect(typeof flag.defaultValue).toBe('boolean')
        }
        if (flag.isExperimental !== undefined) {
          expect(typeof flag.isExperimental).toBe('boolean')
        }
      })
    })

    it('should return the same number of flags as defined keys', () => {
      const flags = getAllFeatureFlags()
      const definedKeys = Object.values(featureFlagKeys)
      expect(Object.keys(flags).length).toBe(definedKeys.length)
    })
  })

  describe('enableFeatureFlag', () => {
    it.each(Object.entries(featureFlagKeys))(
      'should write true to SQLite for %s when enabled',
      (_name, key) => {
        enableFeatureFlag(key)

        expect(writeFeatureFlag).toHaveBeenCalledWith(
          `feature_flag_${key}`,
          true
        )
      }
    )
  })

  describe('disableFeatureFlag', () => {
    it.each(Object.entries(featureFlagKeys))(
      'should delete from SQLite for %s when disabled',
      (_name, key) => {
        disableFeatureFlag(key)

        expect(deleteFeatureFlag).toHaveBeenCalledWith(`feature_flag_${key}`)
      }
    )
  })
})
