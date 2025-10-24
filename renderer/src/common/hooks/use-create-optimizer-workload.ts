import {
  getApiV1BetaWorkloadsByNameOptions,
  getApiV1BetaWorkloadsByNameQueryKey,
  postApiV1BetaWorkloadsMutation,
} from '@api/@tanstack/react-query.gen'
import { featureFlagKeys } from '../../../../utils/feature-flags'
import { useFeatureFlag } from './use-feature-flag'
import {
  ALLOWED_GROUPS_ENV_VAR,
  MCP_OPTIMIZER_GROUP_NAME,
  MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
  META_MCP_SERVER_NAME,
} from '../lib/constants'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaRegistryByNameServersByServerNameOptions } from '@api/@tanstack/react-query.gen'
import { useToastMutation } from './use-toast-mutation'
import type { V1CreateRequest } from '@api/types.gen'
import { toast } from 'sonner'
import log from 'electron-log/renderer'
import { useMcpOptimizerClients } from '@/features/meta-mcp/hooks/use-mcp-optimizer-clients'
import { queryClient } from '../lib/query-client'

export function useCreateOptimizerWorkload() {
  const { saveGroupClients } = useMcpOptimizerClients()
  const isExperimentalFeaturesEnabled = useFeatureFlag(
    featureFlagKeys.EXPERIMENTAL_FEATURES
  )
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)

  const { data: optimizerWorkloadDetail } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: META_MCP_SERVER_NAME },
    }),
    refetchOnMount: true,
    staleTime: 5_000,
    enabled: isExperimentalFeaturesEnabled && isMetaOptimizerEnabled,
  })

  const { data: optimizerRegistryServerDetail } = useQuery({
    ...getApiV1BetaRegistryByNameServersByServerNameOptions({
      path: {
        name: 'default',
        serverName: MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
      },
    }),
    enabled: isExperimentalFeaturesEnabled && isMetaOptimizerEnabled,
  })

  const {
    mutateAsync: createMetaOptimizerWorkload,
    isPending: isPendingCreateMetaOptimizerWorkload,
  } = useToastMutation({
    ...postApiV1BetaWorkloadsMutation(),
    onError: (error) => {
      toast.error('Failed to create MCP Optimizer workload')
      log.error('Failed to create MCP Optimizer workload', error)
    },
    onSuccess: async (data, variables) => {
      const groupToOptimize =
        variables.body.env_vars?.[ALLOWED_GROUPS_ENV_VAR] ?? ''
      if (groupToOptimize) {
        try {
          await saveGroupClients(groupToOptimize)
          log.info('MCP Optimizer workload created', data)
          toast.success('MCP Optimizer installed and running')
        } catch (error) {
          log.error('Failed to save group clients', error)
          toast.error(
            error instanceof Error
              ? error.message
              : 'Failed to save client settings'
          )

          return
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsByNameQueryKey({
          path: { name: META_MCP_SERVER_NAME },
        }),
      })
    },
  })

  const handleCreateMetaOptimizerWorkload = async (groupToOptimize: string) => {
    if (!isExperimentalFeaturesEnabled || !isMetaOptimizerEnabled) return
    const body: V1CreateRequest = {
      name: META_MCP_SERVER_NAME,
      image: optimizerRegistryServerDetail?.server?.image,
      transport: optimizerRegistryServerDetail?.server?.transport,
      group: MCP_OPTIMIZER_GROUP_NAME,
      env_vars: { [ALLOWED_GROUPS_ENV_VAR]: groupToOptimize },
      secrets: [],
      cmd_arguments: [],
      network_isolation: false,
      volumes: [],
    }

    await createMetaOptimizerWorkload({
      body,
    })
  }

  return {
    isNotEnabled: !isExperimentalFeaturesEnabled || !isMetaOptimizerEnabled,
    isPending: isPendingCreateMetaOptimizerWorkload,
    optimizerWorkloadDetail,
    isMCPOptimizerEnabled:
      !!optimizerWorkloadDetail?.env_vars?.[ALLOWED_GROUPS_ENV_VAR],
    handleCreateMetaOptimizerWorkload,
  }
}
