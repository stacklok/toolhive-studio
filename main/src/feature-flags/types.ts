import { featureFlagKeys } from '../../../utils/feature-flags'

export interface FeatureFlagOptions {
  isDisabled?: boolean
  defaultValue?: boolean
  isExperimental?: boolean
}

export type FeatureFlagKey =
  (typeof featureFlagKeys)[keyof typeof featureFlagKeys]
