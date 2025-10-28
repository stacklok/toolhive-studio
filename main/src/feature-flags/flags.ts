import Store from 'electron-store'
import log from '../logger'
import { featureFlagKeys } from '../../../utils/feature-flags'
import type { FeatureFlagKey, FeatureFlagOptions } from './types'

// Import feature flag types from renderer (shared types)
const FLAG_STORE_PREFIX = 'feature_flag_'

const featureFlagOptions: Record<FeatureFlagKey, FeatureFlagOptions> = {
  [featureFlagKeys.CUSTOMIZE_TOOLS]: {
    isDisabled: false,
    defaultValue: false,
    isExperimental: false,
  },
  [featureFlagKeys.GROUPS_IN_REGISTRY]: {
    isDisabled: false,
    defaultValue: false,
    isExperimental: false,
  },
  [featureFlagKeys.META_OPTIMIZER]: {
    isDisabled: false,
    defaultValue: false,
    isExperimental: true,
  },
}

// Create a dedicated store for feature flags
const featureFlagStore = new Store<Record<string, boolean>>({
  name: 'feature-flags',
  defaults: {},
})

export function getFeatureFlag(key: FeatureFlagKey): boolean {
  const options = featureFlagOptions[key] ?? {}

  if (options.isDisabled) {
    return false
  }

  const storeKey = `${FLAG_STORE_PREFIX}${key}`
  const value = featureFlagStore.get(storeKey, options.defaultValue ?? false)

  log.debug(`Getting feature flag ${key}: ${value}`)
  return value
}

export function enableFeatureFlag(key: FeatureFlagKey): void {
  const options = featureFlagOptions[key] ?? {}

  if (options.isDisabled) {
    log.warn(`Attempted to enable disabled feature flag: ${key}`)
    return
  }

  const storeKey = `${FLAG_STORE_PREFIX}${key}`
  featureFlagStore.set(storeKey, true)
  log.info(`Enabled feature flag: ${key}`)
}

export function disableFeatureFlag(key: FeatureFlagKey): void {
  const storeKey = `${FLAG_STORE_PREFIX}${key}`
  featureFlagStore.delete(storeKey)
  log.info(`Disabled feature flag: ${key}`)
}

export function getAllFeatureFlags(): Record<
  FeatureFlagKey,
  FeatureFlagOptions & { enabled: boolean }
> {
  const flags: Record<string, FeatureFlagOptions & { enabled: boolean }> = {}

  Object.values(featureFlagKeys).forEach((key) => {
    const options = featureFlagOptions[key] ?? {}
    flags[key] = {
      ...options,
      enabled: getFeatureFlag(key),
    }
  })

  return flags
}

export type { FeatureFlagKey, FeatureFlagOptions }
