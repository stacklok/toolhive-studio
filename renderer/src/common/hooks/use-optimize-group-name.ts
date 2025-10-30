import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsByNameOptions } from '@api/@tanstack/react-query.gen'
import { featureFlagKeys } from '../../../../utils/feature-flags'
import { META_MCP_SERVER_NAME } from '../lib/constants'
import { useFeatureFlag } from './use-feature-flag'

export function useOptimizedGroupName() {
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
  const { data: optimizerWorkloadDetail } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: META_MCP_SERVER_NAME },
    }),
    retry: false,
    enabled: isMetaOptimizerEnabled,
  })
  return optimizerWorkloadDetail?.env_vars?.ALLOWED_GROUPS
}
