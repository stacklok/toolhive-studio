import {
  getApiV1BetaWorkloadsByNameOptions,
  getApiV1BetaWorkloadsByNameQueryKey,
} from '@api/@tanstack/react-query.gen'
import { postApiV1BetaWorkloads } from '@api/sdk.gen'
import { featureFlagKeys } from '../../../../../utils/feature-flags'
import { useFeatureFlag } from '../../../common/hooks/use-feature-flag'
import {
  ALLOWED_GROUPS_ENV_VAR,
  MCP_OPTIMIZER_GROUP_NAME,
  MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
  META_MCP_SERVER_NAME,
} from '../../../common/lib/constants'
import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaRegistryByNameServersByServerNameOptions } from '@api/@tanstack/react-query.gen'
import { useToastMutation } from '../../../common/hooks/use-toast-mutation'
import type { V1CreateRequest } from '@api/types.gen'
import { toast } from 'sonner'
import log from 'electron-log/renderer'
import { useMcpOptimizerClients } from '@/features/meta-mcp/hooks/use-mcp-optimizer-clients'
import { queryClient } from '../../../common/lib/query-client'
import { trackEvent } from '../../../common/lib/analytics'

export function useCreateOptimizerWorkload() {
  const { saveGroupClients } = useMcpOptimizerClients()
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
  const { data: optimizerWorkloadDetail } = useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: META_MCP_SERVER_NAME },
    }),
    refetchOnMount: true,
    staleTime: 5_000,
    retry: false,
    enabled: isMetaOptimizerEnabled,
  })

  const { data: optimizerRegistryServerDetail } = useQuery({
    ...getApiV1BetaRegistryByNameServersByServerNameOptions({
      path: {
        name: 'default',
        serverName: MCP_OPTIMIZER_REGISTRY_SERVER_NAME,
      },
    }),
    enabled: isMetaOptimizerEnabled,
  })

  const {
    mutateAsync: createMetaOptimizerWorkload,
    isPending: isPendingCreateMetaOptimizerWorkload,
  } = useToastMutation<
    Awaited<ReturnType<typeof postApiV1BetaWorkloads>>,
    Error,
    { body: V1CreateRequest; optimized_workloads: string[] }
  >({
    mutationFn: async ({ body }) => {
      return await postApiV1BetaWorkloads({ body, throwOnError: true })
    },
    errorMsg: 'Failed to create MCP Optimizer workload',
    onError: (error) => {
      log.error('Failed to create MCP Optimizer workload', error)
    },
    onSuccess: async (data, variables) => {
      const groupToOptimize =
        variables.body.env_vars?.[ALLOWED_GROUPS_ENV_VAR] ?? ''

      trackEvent('MCP Optimizer workload created', {
        optimized_group_name: groupToOptimize,
        workload: META_MCP_SERVER_NAME,
        image: optimizerRegistryServerDetail?.server?.image,
        group: variables.body.group,
        'custom.optimized_workloads': variables.optimized_workloads.join(','),
        optimized_workloads: variables.optimized_workloads.length,
      })

      if (groupToOptimize) {
        try {
          await saveGroupClients({ groupName: groupToOptimize })
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

  const handleCreateMetaOptimizerWorkload = async ({
    groupToOptimize,
    optimized_workloads,
  }: {
    groupToOptimize: string
    optimized_workloads: string[]
  }) => {
    if (!isMetaOptimizerEnabled) return
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
    try {
      await createMetaOptimizerWorkload({
        body,
        optimized_workloads,
      })
    } catch {
      // stop propagating error
    }
  }

  return {
    isNotEnabled: !isMetaOptimizerEnabled,
    isPending: isPendingCreateMetaOptimizerWorkload,
    optimizerWorkloadDetail,
    isMCPOptimizerEnabled:
      !!optimizerWorkloadDetail?.env_vars?.[ALLOWED_GROUPS_ENV_VAR],
    handleCreateMetaOptimizerWorkload,
  }
}
