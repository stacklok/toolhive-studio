import { queryClient } from '../lib/query-client'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import {
  deleteApiV1BetaGroupsByNameMutation,
  getApiV1BetaDiscoveryClientsQueryKey,
  getApiV1BetaGroupsOptions,
  getApiV1BetaGroupsQueryKey,
  getApiV1BetaWorkloadsByNameOptions,
  postApiV1BetaClientsRegisterMutation,
} from '@common/api/generated/@tanstack/react-query.gen'
import { deleteApiV1BetaClientsByNameGroupsByGroup } from '@common/api/generated/index'
import { useCallback } from 'react'
import { useToastMutation } from './use-toast-mutation'
import log from 'electron-log/renderer'
import { trackEvent } from '../lib/analytics'

function useDeleteGroup() {
  const { mutateAsync: deleteGroup } = useToastMutation({
    ...deleteApiV1BetaGroupsByNameMutation(),
    onError: (error, variables) => {
      log.error(`Failed to delete group "${variables.path.name}"`, error)
    },
    onSuccess: (_, variables) => {
      trackEvent(`Group deleted ${MCP_OPTIMIZER_GROUP_NAME}`, {
        group_name: variables.path.name,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
    errorMsg: 'Failed to delete MCP Optimizer group',
    successMsg: 'MCP Optimizer is disabled',
    loadingMsg: 'Disabling MCP Optimizer and cleaning up...',
  })

  return deleteGroup
}

function useUnregisterClients() {
  const { mutateAsync: unregisterClients } = useToastMutation({
    mutationFn: async ({ clientType }: { clientType: string }) => {
      return await deleteApiV1BetaClientsByNameGroupsByGroup({
        path: {
          name: clientType,
          group: MCP_OPTIMIZER_GROUP_NAME,
        },
        throwOnError: true,
      })
    },
    onError: (error, variables) => {
      log.error(
        `Failed to unregister client "${variables.clientType}" from group "${MCP_OPTIMIZER_GROUP_NAME}"`,
        error
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
    errorMsg: 'Failed to unregister client from group',
  })

  return unregisterClients
}

function useRegisterClientsToTarget() {
  const { mutateAsync: registerClients } = useToastMutation({
    ...postApiV1BetaClientsRegisterMutation(),
    onError: (error) => {
      log.error('Error registering clients during restore', error)
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: getApiV1BetaDiscoveryClientsQueryKey(),
      })
      await queryClient.invalidateQueries({
        queryKey: getApiV1BetaGroupsQueryKey(),
      })
    },
  })

  return registerClients
}

export function useCleanupMetaOptimizer() {
  const deleteGroup = useDeleteGroup()
  const unregisterClients = useUnregisterClients()
  const registerClients = useRegisterClientsToTarget()

  const cleanupMetaOptimizer = useCallback(async () => {
    // Always fetch fresh state at call-time rather than relying on
    // useQuery-backed closures. This keeps the cleanup independent of the
    // React render lifecycle so it is safe to call once from startup where
    // the relevant queries may not have resolved yet.
    const groupsData = await queryClient.fetchQuery(getApiV1BetaGroupsOptions())
    const optimizerGroup = groupsData?.groups?.find(
      (g) => g.name === MCP_OPTIMIZER_GROUP_NAME
    )
    if (!optimizerGroup) return

    let allowedGroup: string | undefined
    try {
      const workloadDetail = await queryClient.fetchQuery(
        getApiV1BetaWorkloadsByNameOptions({
          path: { name: META_MCP_SERVER_NAME },
        })
      )
      allowedGroup = workloadDetail?.env_vars?.ALLOWED_GROUPS
    } catch {
      // meta-mcp workload may no longer exist (404); that's fine - we just
      // skip the restoration step and proceed with unregistering + delete.
    }

    const registeredClients = optimizerGroup.registered_clients ?? []
    if (registeredClients.length > 0) {
      if (allowedGroup) {
        try {
          await registerClients({
            body: {
              names: registeredClients,
              groups: [allowedGroup],
            },
          })
          log.info(
            `Restored clients ${registeredClients.join(', ')} to ${allowedGroup} group`
          )
        } catch (error) {
          log.error(`Error restoring clients to group ${allowedGroup}:`, error)
        }
      }

      for (const clientType of registeredClients) {
        await unregisterClients({ clientType })
      }
    }

    await deleteGroup({
      path: { name: MCP_OPTIMIZER_GROUP_NAME },
      query: { 'with-workloads': true },
    })
  }, [deleteGroup, registerClients, unregisterClients])

  return { cleanupMetaOptimizer }
}
