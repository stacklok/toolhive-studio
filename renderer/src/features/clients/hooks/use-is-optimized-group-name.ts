import { useQuery } from '@tanstack/react-query'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'
import { META_MCP_SERVER_NAME } from '@/common/lib/constants'
import { getApiV1BetaWorkloadsByNameOptions } from '@api/@tanstack/react-query.gen'

export function useIsOptimizedGroupName(groupName: string) {
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
  const optimizerAllowedGroup =
    optimizerWorkloadDetail?.env_vars?.ALLOWED_GROUPS
  return groupName === optimizerAllowedGroup
}
