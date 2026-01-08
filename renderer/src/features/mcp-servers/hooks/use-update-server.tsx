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

  const { mutateAsync: updateServerMutation } = useMutation({
    mutationFn: async ({
      data,
    }: {
      data: TIsRemote extends true ? FormSchemaRemoteMcp : FormSchemaLocalMcp
    }) => {
      if (isRemoteFormData(data, options?.isRemote)) {
        // Remote server update - handle secrets not in store
        const isDefaultAuthType = data.auth_type === 'none'
        const secrets = isDefaultAuthType
          ? data.secrets
          : data.oauth_config.client_secret
            ? [data.oauth_config.client_secret]
            : []

        const hasNewSecrets = secrets.some((s) => !s.value?.isFromStore)

        // Handle secrets and get actual names (handles naming collisions)
        const newlyCreatedSecrets = hasNewSecrets
          ? (await handleSecrets(secrets)).newlyCreatedSecrets
          : undefined

        const updateRequest = prepareUpdateRemoteWorkloadData(
          data,
          newlyCreatedSecrets
        )

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
      trackEvent(
        `Workload ${options?.isRemote ? 'remote ' : ''}${serverName} updated`,
        {
          workload: serverName,
          is_editing: 'true',
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
