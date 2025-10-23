import { getApiV1BetaWorkloadsByNameOptions } from '@api/@tanstack/react-query.gen'
import { featureFlagKeys } from '../../../../utils/feature-flags'

import { useFeatureFlag } from './use-feature-flag'
import { META_MCP_SERVER_NAME } from '../lib/constants'
import { useQuery } from '@tanstack/react-query'

export function useCreateOptimizerWorkload() {
  const isExperimentalFeaturesEnabled = useFeatureFlag(
    featureFlagKeys.EXPERIMENTAL_FEATURES
  )
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)

  const { data: workloadDetail } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: META_MCP_SERVER_NAME },
    }),
    staleTime: 0,
    gcTime: 0,
    enabled: isExperimentalFeaturesEnabled && isMetaOptimizerEnabled,
  })

  return {
    isExperimentalFeaturesEnabled,
    isMetaOptimizerEnabled,
    workloadDetail,
  }
}
