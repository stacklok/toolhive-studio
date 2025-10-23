import { postApiV1BetaGroups } from '@api/index'
import { useMutation, useQuery } from '@tanstack/react-query'
import { MCP_OPTIMIZER_GROUP_NAME } from '../lib/constants'
import { queryClient } from '../lib/query-client'
import {
  getApiV1BetaGroupsOptions,
  getApiV1BetaGroupsQueryKey,
} from '@api/@tanstack/react-query.gen'
import log from 'electron-log/renderer'
import { useFeatureFlag } from './use-feature-flag'
import { useCallback } from 'react'
import { featureFlagKeys } from '../../../../utils/feature-flags'
import { toast } from 'sonner'

export function useCreateOptimizerGroup() {
  const isExperimentalFeaturesEnabled = useFeatureFlag(
    featureFlagKeys.EXPERIMENTAL_FEATURES
  )
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
  const { data: rawGroups } = useQuery({
    ...getApiV1BetaGroupsOptions(),
    staleTime: 0,
    gcTime: 0,
  })

  const { mutateAsync: createOptimizerGroup } = useMutation({
    mutationFn: async () => {
      return await postApiV1BetaGroups({
        body: { name: MCP_OPTIMIZER_GROUP_NAME },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
    onError: (error) => {
      toast.error('Failed to create MCP Optimizer group')
      log.error('Failed to create optimizer group', error)
    },
  })

  const handleCreateOptimizerGroup = useCallback(async () => {
    const metaOptimizerGrp = rawGroups?.groups?.find(
      (group) => group.name === MCP_OPTIMIZER_GROUP_NAME
    )
    if (metaOptimizerGrp) return

    if (!isExperimentalFeaturesEnabled || !isMetaOptimizerEnabled) return
    await createOptimizerGroup()
  }, [
    isExperimentalFeaturesEnabled,
    isMetaOptimizerEnabled,
    createOptimizerGroup,
    rawGroups,
  ])

  return { handleCreateOptimizerGroup }
}
