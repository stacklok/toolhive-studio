import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroupsOptions } from '@common/api/generated/@tanstack/react-query.gen'
import { useMemo } from 'react'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

export function useGroups() {
  const groupsQuery = useQuery({
    ...getApiV1BetaGroupsOptions(),
    staleTime: 5_000,
  })

  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)

  const filteredGroups = useMemo(() => {
    if (!groupsQuery.data?.groups) {
      return groupsQuery.data
    }

    if (!isMetaOptimizerEnabled) {
      return groupsQuery.data
    }

    return {
      ...groupsQuery.data,
      groups: groupsQuery.data.groups.filter(
        (group) => group.name !== MCP_OPTIMIZER_GROUP_NAME
      ),
    }
  }, [groupsQuery.data, isMetaOptimizerEnabled])

  return {
    ...groupsQuery,
    data: filteredGroups,
  }
}
