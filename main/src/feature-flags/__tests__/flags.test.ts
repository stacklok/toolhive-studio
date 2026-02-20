import { describe, it, expect, vi, beforeEach } from 'vitest'
import { featureFlagKeys } from '../../../../utils/feature-flags'

const { mockStoreInstance } = vi.hoisted(() => ({
  mockStoreInstance: {
    get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue ?? false),
    set: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('electron-store', () => {
  return {
    default: vi.fn(function ElectronStore() {
      return mockStoreInstance
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
        // All flags default to false unless explicitly enabled
        expect(typeof result).toBe('boolean')
      }
    )

    it('should return stored value when flag is enabled in store', () => {
      // First call: readFromElectronStore(SQLITE_READS_FEATURE_FLAGS) -> false (default)
      // Second call: readFromElectronStore(meta_optimizer) -> true
      mockStoreInstance.get
        .mockReturnValueOnce(false) // SQLITE_READS_FEATURE_FLAGS check
        .mockReturnValueOnce(true) // actual flag value
      const result = getFeatureFlag(featureFlagKeys.META_OPTIMIZER)
      expect(result).toBe(true)
    })

    it('should return false when flag is disabled in store', () => {
      mockStoreInstance.get.mockReturnValueOnce(false)
      const flagKeys = Object.values(featureFlagKeys)
      // We know there's at least one flag defined
      const result = getFeatureFlag(flagKeys[0]!)
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
        // Optional properties should be boolean or undefined
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
      'should store true for %s when enabled',
      (_name, key) => {
        enableFeatureFlag(key)

        expect(mockStoreInstance.set).toHaveBeenCalledWith(
          `feature_flag_${key}`,
          true
        )
      }
    )
  })

  describe('disableFeatureFlag', () => {
    it.each(Object.entries(featureFlagKeys))(
      'should delete stored value for %s when disabled',
      (_name, key) => {
        disableFeatureFlag(key)

        expect(mockStoreInstance.delete).toHaveBeenCalledWith(
          `feature_flag_${key}`
        )
      }
    )
  })
})
