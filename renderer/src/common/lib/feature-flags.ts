import { featureFlagKeys } from '../../../../utils/feature-flags'
import { queryClient } from './query-client'

export type FeatureFlagKey =
  (typeof featureFlagKeys)[keyof typeof featureFlagKeys]

const getFeatureFlag = (key: FeatureFlagKey) => async (): Promise<boolean> => {
  try {
    const value = await window.electronAPI.featureFlags.get(key)
    return value
  } catch (error) {
    console.error(`Failed to get feature flag ${key}:`, error)
    return false
  }
}

const getCreateFeatureFlag =
  (key: FeatureFlagKey) => async (): Promise<void> => {
    try {
      await window.electronAPI.featureFlags.enable(key)
      // Update React Query cache
      queryClient.setQueryData(['featureFlag', key], true)
      queryClient.invalidateQueries({ queryKey: ['featureFlag', key] })
    } catch (error) {
      console.error(`Failed to enable feature flag ${key}:`, error)
    }
  }

const getDeleteFeatureFlag =
  (key: FeatureFlagKey) => async (): Promise<void> => {
    try {
      await window.electronAPI.featureFlags.disable(key)
      // Update React Query cache
      queryClient.setQueryData(['featureFlag', key], false)
      queryClient.invalidateQueries({ queryKey: ['featureFlag', key] })
    } catch (error) {
      console.error(`Failed to disable feature flag ${key}:`, error)
    }
  }

const keyValueFlag = Object.values(featureFlagKeys).map((key) => [
  key,
  {
    disable: getDeleteFeatureFlag(key),
    enable: getCreateFeatureFlag(key),
    isEnabled: getFeatureFlag(key),
  },
])

const FeatureFlagClient: {
  [key in FeatureFlagKey]: {
    enable: () => Promise<void>
    disable: () => Promise<void>
    isEnabled: () => Promise<boolean>
  }
} = Object.fromEntries(keyValueFlag) as {
  [key in FeatureFlagKey]: {
    enable: () => Promise<void>
    disable: () => Promise<void>
    isEnabled: () => Promise<boolean>
  }
}

// Additional utility function to get all feature flags at once
const getAllFeatureFlags = async (): Promise<
  Record<FeatureFlagKey, boolean>
> => {
  try {
    const flags = await window.electronAPI.featureFlags.getAll()
    return Object.fromEntries(
      Object.entries(flags ?? {}).map(([key, options]) => [
        key,
        options.enabled,
      ])
    ) as Record<FeatureFlagKey, boolean>
  } catch (error) {
    console.error('Failed to get all feature flags:', error)
    // Return default values on error
    const defaults: Record<string, boolean> = {}
    Object.values(featureFlagKeys).forEach((key) => {
      defaults[key] = false
    })
    return defaults
  }
}

/**
 * Feature flags exposed to window for developer tools access.
 * This is temporary until we move the feature flags to settings
 *
 * Usage in developer tools:
 * - FeatureFlag.playground.enable()    // Enable playground feature
 * - FeatureFlag.playground.disable()   // Disable playground feature
 * - FeatureFlag.playground.isEnabled() // Check if enabled (logs result to console)
 * - FeatureFlag.getAll()               // Get all feature flags
 * - FeatureFlag.list()                 // Show helpful commands in console
 */
// Create synchronous wrappers for developer tools
const createSyncFeatureFlag = (key: FeatureFlagKey) => ({
  enable: () => {
    FeatureFlagClient[key].enable().catch(console.error)
  },
  disable: () => {
    FeatureFlagClient[key].disable().catch(console.error)
  },
  isEnabled: () => {
    FeatureFlagClient[key]
      .isEnabled()
      .then((result) =>
        console.log(`${key} is ${result ? 'enabled' : 'disabled'}`)
      )
      .catch(console.error)
  },
  enableExperimental: () => {
    window.electronAPI.featureFlags
      .enableExperimentalFeature(key)
      .catch(console.error)
  },
  disableExperimental: () => {
    window.electronAPI.featureFlags
      .disableExperimentalFeature(key)
      .catch(console.error)
  },
})

// Create the feature flag object
const featureFlagObject = {
  // Create sync wrappers for each flag
  ...Object.fromEntries(
    Object.values(featureFlagKeys).map((key) => [
      key,
      createSyncFeatureFlag(key),
    ])
  ),
  // Additional helper functions for developer tools
  getAll: () => {
    getAllFeatureFlags()
      .then((flags) => console.table(flags))
      .catch(console.error)
  },
  list: () => {
    getAllFeatureFlags()
      .then((flags) => {
        console.table(flags)
        console.log('Available commands:')
        Object.keys(featureFlagKeys).forEach((key) => {
          const flagKey = featureFlagKeys[key as keyof typeof featureFlagKeys]
          console.log(`  FeatureFlag.${flagKey}.enable()`)
          console.log(`  FeatureFlag.${flagKey}.disable()`)
          console.log(`  FeatureFlag.${flagKey}.isEnabled()`)
          console.log(`  FeatureFlag.${flagKey}.isExperimental()`)
        })
      })
      .catch(console.error)
  },
}

declare global {
  interface Window {
    FeatureFlag: typeof featureFlagObject
  }
}

window.FeatureFlag = featureFlagObject
