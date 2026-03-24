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
}

// Kept for one-time reconciliation migration; remove after migration grace period
export const featureFlagStore = new Store<Record<string, boolean>>({
  name: 'feature-flags',
  defaults: {},
})

export function getFeatureFlag(key: FeatureFlagKey): boolean {
  const options = featureFlagOptions[key] ?? {}

  if (options.isDisabled) {
    return false
  }

  try {
    const dbValue = readFeatureFlagFromDb(`${FLAG_STORE_PREFIX}${key}`)
    if (dbValue !== undefined) {
      log.debug(`Getting feature flag ${key} from SQLite: ${dbValue}`)
      return dbValue
    }
  } catch (err) {
    log.error('[DB] SQLite read failed for feature flag:', err)
  }

  const defaultValue = options.defaultValue ?? false
  log.debug(`Getting feature flag ${key}: ${defaultValue}`)
  return defaultValue
}

export function enableFeatureFlag(key: FeatureFlagKey): void {
  const options = featureFlagOptions[key] ?? {}

  if (options.isDisabled) {
    log.warn(`Attempted to enable disabled feature flag: ${key}`)
    return
  }

  const storeKey = `${FLAG_STORE_PREFIX}${key}`
  try {
    writeFeatureFlag(storeKey, true)
  } catch (err) {
    log.error('[DB] Failed to write feature flag:', err)
  }

  log.info(`Enabled feature flag: ${key}`)
}

export function disableFeatureFlag(key: FeatureFlagKey): void {
  const storeKey = `${FLAG_STORE_PREFIX}${key}`

  try {
    deleteFeatureFlagFromDb(storeKey)
  } catch (err) {
    log.error('[DB] Failed to delete feature flag:', err)
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
