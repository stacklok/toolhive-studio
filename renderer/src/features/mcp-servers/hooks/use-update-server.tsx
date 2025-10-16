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
import {
  getApiV1BetaWorkloadsOptions,
  getApiV1BetaWorkloadsByNameOptions,
} from '@api/@tanstack/react-query.gen'

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

  const updateWorkload = useMutationUpdateWorkload()

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
    },
    onSuccess: async (_result, { data }) => {
      // Collect groups to invalidate (original and new)
      const groupsToInvalidate = new Set<string>()

      // Look up the original group from the cache
      const existingServerData = queryClient.getQueryData(
        getApiV1BetaWorkloadsByNameOptions({
          path: { name: serverName },
        }).queryKey
      )

      if (existingServerData?.group) {
        groupsToInvalidate.add(existingServerData.group)
      }

      if (data.group) {
        groupsToInvalidate.add(data.group)
      }

      // Invalidate queries for all affected groups
      await Promise.all(
        Array.from(groupsToInvalidate).map((group) =>
          queryClient.invalidateQueries({
            queryKey: getApiV1BetaWorkloadsOptions({
              query: { all: true, group },
            }).queryKey,
          })
        )
      )
    },
    onMutate: ({ data }) => {
      trackEvent(
        `Workload ${options?.isRemote ? 'remote ' : ''}${serverName} updated`,
        {
          workload: serverName,
          is_editing: 'true',
          remote: options?.isRemote ? 'true' : 'false',
          ...(isRemoteFormData(data, options?.isRemote)
            ? { auth_type: data.auth_type }
            : { type: data.type }),
          transport: data.transport,
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
