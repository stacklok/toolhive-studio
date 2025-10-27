import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type PostApiV1BetaSecretsDefaultKeysData } from '@api/types.gen'
import type { Options } from '@api/client'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'
import { prepareUpdateLocalWorkloadData } from '../lib/orchestrate-run-local-server'
import { prepareUpdateRemoteWorkloadData } from '../lib/orchestrate-run-remote-server'
import type { FormSchemaLocalMcp } from '../lib/form-schema-local-mcp'
import { useMCPSecrets } from '@/common/hooks/use-mcp-secrets'
import { useMutationUpdateWorkload } from './use-mutation-update-workload'
import { useLocation } from '@tanstack/react-router'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { useNotificationOptimizer } from './use-notification-optimizer'
import {
  ALLOWED_GROUPS_ENV_VAR,
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '@/common/lib/constants'
import { useOptimizedWorkloads } from '@/common/hooks/use-optimized-workloads'

type UseUpdateServerOptions<TIsRemote extends boolean = false> = {
  isRemote?: TIsRemote
  onSecretSuccess?: (completedCount: number, secretsCount: number) => void
  onSecretError?: (
    error: string,
    variables: Options<PostApiV1BetaSecretsDefaultKeysData>
  ) => void
}

function isRemoteFormData(
  _data: FormSchemaLocalMcp | FormSchemaRemoteMcp,
  isRemote: boolean | undefined
): _data is FormSchemaRemoteMcp {
  return isRemote === true
}

export function useUpdateServer<TIsRemote extends boolean = false>(
  serverName: string,
  options?: UseUpdateServerOptions<TIsRemote>
) {
  const { pathname } = useLocation()
  const queryClient = useQueryClient()
  const { handleSecrets, isPendingSecrets, isErrorSecrets } = useMCPSecrets({
    onSecretSuccess: options?.onSecretSuccess || (() => {}),
    onSecretError: options?.onSecretError || (() => {}),
  })
  const notifyChangeWithOptimizer = useNotificationOptimizer()
  const updateWorkload = useMutationUpdateWorkload()
  const { getOptimizedWorkloads } = useOptimizedWorkloads()

  const { mutateAsync: updateServerMutation } = useMutation({
    mutationFn: async ({
      data,
    }: {
      data: TIsRemote extends true ? FormSchemaRemoteMcp : FormSchemaLocalMcp
    }) => {
      if (isRemoteFormData(data, options?.isRemote)) {
        // Remote server update - no secrets handling
        const updateRequest = prepareUpdateRemoteWorkloadData(data)

        await updateWorkload({
          path: { name: serverName },
          body: updateRequest,
        })
      } else {
        // Local server update - handle secrets
        const { newlyCreatedSecrets, existingSecrets } = await handleSecrets(
          data.secrets
        )

        const allSecrets = [
          ...newlyCreatedSecrets,
          ...existingSecrets.map((secret) => ({
            name: secret.value.secret,
            target: secret.name,
          })),
        ]

        const updateRequest = prepareUpdateLocalWorkloadData(data, allSecrets)

        await updateWorkload({
          path: { name: serverName },
          body: updateRequest,
        })
      }

      await restartClientNotification({
        queryClient,
      })
      notifyChangeWithOptimizer(data.group)
    },
    onSuccess: async (_, variables) => {
      const envVars = 'envVars' in variables.data ? variables.data.envVars : []
      const optimizedGroupName = envVars.find(
        (env: { name: string; value: string }) =>
          env.name === ALLOWED_GROUPS_ENV_VAR
      )?.value

      const workloads = await getOptimizedWorkloads({
        groupName: optimizedGroupName ?? '',
        serverName,
      })
      trackEvent(
        `Workload ${options?.isRemote ? 'remote ' : ''}${serverName} updated`,
        {
          workload: serverName,
          is_editing: 'true',
          optimized_group_name: optimizedGroupName,
          optimized_workloads: JSON.stringify(workloads),
          is_mcp_optimizer: `${serverName === META_MCP_SERVER_NAME}`,
          is_optimizer_group: `${variables.data.group === MCP_OPTIMIZER_GROUP_NAME}`,
          remote: options?.isRemote ? 'true' : 'false',
          ...(isRemoteFormData(variables.data, options?.isRemote)
            ? { auth_type: variables.data.auth_type }
            : { type: variables.data.type }),
          transport: variables.data.transport,
          'route.pathname': pathname,
        }
      )
    },
  })

  return {
    updateServerMutation,
    isPendingSecrets,
    isErrorSecrets,
  }
}
