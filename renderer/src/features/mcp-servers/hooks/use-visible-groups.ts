import { useMemo } from 'react'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../utils/feature-flags'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'

export function useVisibleGroups<T extends { name?: string | null }>(
  groups: T[]
): T[] {
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)

  return useMemo(() => {
    if (!isMetaOptimizerEnabled) {
      return groups
    }
    return groups.filter((group) => group.name !== MCP_OPTIMIZER_GROUP_NAME)
  }, [groups, isMetaOptimizerEnabled])
}
