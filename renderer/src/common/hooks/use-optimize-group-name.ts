import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsByNameOptions } from '@api/@tanstack/react-query.gen'
import { featureFlagKeys } from '../../../../utils/feature-flags'
import { META_MCP_SERVER_NAME } from '../lib/constants'
import { useFeatureFlag } from './use-feature-flag'

export function useOptimizedGroupName() {
  const isExperimentalFeaturesEnabled = useFeatureFlag(
    featureFlagKeys.EXPERIMENTAL_FEATURES
  )
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
  const { data: optimizerWorkloadDetail } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: META_MCP_SERVER_NAME },
    }),
    staleTime: 0,
    gcTime: 0,
    enabled: isExperimentalFeaturesEnabled && isMetaOptimizerEnabled,
  })
  return optimizerWorkloadDetail?.env_vars?.ALLOWED_GROUPS
}
