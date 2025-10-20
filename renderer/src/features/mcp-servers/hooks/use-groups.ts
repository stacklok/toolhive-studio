import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaGroups } from '@api/sdk.gen'
import type { V1GroupListResponse } from '@api/types.gen'
import { useMemo } from 'react'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

export function useRawGroups() {
  return useQuery({
    queryKey: ['api', 'v1beta', 'groups'],
    queryFn: async () => {
      const response = await getApiV1BetaGroups({
        parseAs: 'text',
        responseStyle: 'data',
      })
      const parsed =
        typeof response === 'string' ? JSON.parse(response) : response
      return parsed as V1GroupListResponse
    },
    staleTime: 5_000,
  })
}

export function useGroups() {
  const rawGroupsQuery = useRawGroups()
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)

  const filteredGroups = useMemo(() => {
    if (!rawGroupsQuery.data?.groups) {
      return rawGroupsQuery.data
    }

    if (!isMetaOptimizerEnabled) {
      return rawGroupsQuery.data
    }

    return {
      ...rawGroupsQuery.data,
      groups: rawGroupsQuery.data.groups.filter(
        (group) => group.name !== MCP_OPTIMIZER_GROUP_NAME
      ),
    }
  }, [rawGroupsQuery.data, isMetaOptimizerEnabled])

  return {
    ...rawGroupsQuery,
    data: filteredGroups,
  }
}
