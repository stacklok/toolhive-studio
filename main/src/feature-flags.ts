import Store from 'electron-store'
import log from './logger'
import { featureFlagKeys } from '../../utils/feature-flags'

// Import feature flag types from renderer (shared types)
const FLAG_STORE_PREFIX = 'feature_flag_'

type FeatureFlagKey = (typeof featureFlagKeys)[keyof typeof featureFlagKeys]

interface FeatureFlagOptions {
  isDisabled?: boolean
  defaultValue?: boolean
}

const featureFlagOptions: Record<FeatureFlagKey, FeatureFlagOptions> = {
  [featureFlagKeys.GROUPS]: {
    isDisabled: false,
    defaultValue: false,
  },
  [featureFlagKeys.CUSTOMIZE_TOOLS]: {
    isDisabled: false,
    defaultValue: false,
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

export function getAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  const flags: Record<string, boolean> = {}

  Object.values(featureFlagKeys).forEach((key) => {
    flags[key] = getFeatureFlag(key)
  })

  return flags
}

export type { FeatureFlagKey }
