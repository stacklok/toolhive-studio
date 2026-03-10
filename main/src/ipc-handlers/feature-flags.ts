import { ipcMain } from 'electron'
import {
  getFeatureFlag,
  enableFeatureFlag,
  disableFeatureFlag,
  getAllFeatureFlags,
  type FeatureFlagKey,
  type FeatureFlagOptions,
} from '../feature-flags'

export function register() {
  ipcMain.handle(
    'feature-flags:get',
    (_event, key: FeatureFlagKey): boolean => {
      return getFeatureFlag(key)
    }
  )

  ipcMain.handle(
    'feature-flags:enable',
    (_event, key: FeatureFlagKey): void => {
      enableFeatureFlag(key)
    }
  )

  ipcMain.handle(
    'feature-flags:disable',
    (_event, key: FeatureFlagKey): void => {
      disableFeatureFlag(key)
    }
  )

  ipcMain.handle(
    'feature-flags:get-all',
    (): Record<FeatureFlagKey, FeatureFlagOptions & { enabled: boolean }> => {
      return getAllFeatureFlags()
    }
  )
}
