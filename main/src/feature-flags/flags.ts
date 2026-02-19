import Store from 'electron-store'
import log from '../logger'
import { featureFlagKeys } from '../../../utils/feature-flags'
import type { FeatureFlagKey, FeatureFlagOptions } from './types'
import {
  writeFeatureFlag,
  deleteFeatureFlag as deleteFeatureFlagFromDb,
} from '../db/writers/feature-flags-writer'
import { readFeatureFlag as readFeatureFlagFromDb } from '../db/readers/feature-flags-reader'

const FLAG_STORE_PREFIX = 'feature_flag_'

const featureFlagOptions: Record<FeatureFlagKey, FeatureFlagOptions> = {
  [featureFlagKeys.META_OPTIMIZER]: {
    isDisabled: false,
    defaultValue: false,
    isExperimental: true,
  },
  [featureFlagKeys.SQLITE_READS_SETTINGS]: {
    isDisabled: false,
    defaultValue: false,
    isExperimental: true,
  },
  [featureFlagKeys.SQLITE_READS_THREADS]: {
    isDisabled: false,
    defaultValue: false,
    isExperimental: true,
  },
  [featureFlagKeys.SQLITE_READS_CHAT_SETTINGS]: {
    isDisabled: false,
    defaultValue: false,
    isExperimental: true,
  },
  [featureFlagKeys.SQLITE_READS_FEATURE_FLAGS]: {
    isDisabled: false,
    defaultValue: false,
    isExperimental: true,
  },
  [featureFlagKeys.SQLITE_READS_SHUTDOWN]: {
    isDisabled: false,
    defaultValue: false,
    isExperimental: true,
  },
}

// Create a dedicated store for feature flags
export const featureFlagStore = new Store<Record<string, boolean>>({
  name: 'feature-flags',
  defaults: {},
})

function readFromElectronStore(key: FeatureFlagKey): boolean {
  const options = featureFlagOptions[key] ?? {}
  const storeKey = `${FLAG_STORE_PREFIX}${key}`
  return featureFlagStore.get(storeKey, options.defaultValue ?? false)
}

export function getFeatureFlag(key: FeatureFlagKey): boolean {
  const options = featureFlagOptions[key] ?? {}

  if (options.isDisabled) {
    return false
  }

  // sqlite_reads_* flags always come from electron-store to avoid circularity
  if (key.startsWith('sqlite_reads_')) {
    const value = readFromElectronStore(key)
    log.debug(`Getting feature flag ${key}: ${value}`)
    return value
  }

  // For other flags, check if SQLite reads are enabled for the feature-flags domain
  if (readFromElectronStore(featureFlagKeys.SQLITE_READS_FEATURE_FLAGS)) {
    try {
      const dbValue = readFeatureFlagFromDb(`${FLAG_STORE_PREFIX}${key}`)
      if (dbValue !== undefined) {
        log.debug(`Getting feature flag ${key} from SQLite: ${dbValue}`)
        return dbValue
      }
    } catch (err) {
      log.error('[DB] SQLite read failed for feature flag, falling back:', err)
    }
  }

  const value = readFromElectronStore(key)
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

  try {
    writeFeatureFlag(storeKey, true)
  } catch (err) {
    log.error('[DB] Failed to dual-write feature flag:', err)
  }

  log.info(`Enabled feature flag: ${key}`)
}

export function disableFeatureFlag(key: FeatureFlagKey): void {
  const storeKey = `${FLAG_STORE_PREFIX}${key}`
  featureFlagStore.delete(storeKey)

  try {
    deleteFeatureFlagFromDb(storeKey)
  } catch (err) {
    log.error('[DB] Failed to dual-write feature flag deletion:', err)
  }

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
