import {
  postApiV1BetaWorkloadsByNameEditMutation,
  getApiV1BetaWorkloadsByNameStatusOptions,
  getApiV1BetaWorkloadsQueryKey,
  postApiV1BetaSecretsDefaultKeysMutation,
} from '@api/@tanstack/react-query.gen'
import { getApiV1BetaSecretsDefaultKeys } from '@api/sdk.gen'
import { pollServerStatus } from '@/common/lib/polling'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import {
  type PostApiV1BetaSecretsDefaultKeysData,
  type SecretsSecretParameter,
} from '@api/types.gen'
import type { Options } from '@api/client'
import type { FormSchemaRemoteMcp } from '../lib/form-schema-remote-mcp'
import { prepareSecretsWithoutNamingCollision } from '@/common/lib/secrets/prepare-secrets-without-naming-collision'
import { toast } from 'sonner'
import { Button } from '@/common/components/ui/button'
import { Link } from '@tanstack/react-router'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'
import {
  getDefinedSecrets,
  groupSecrets,
  prepareUpdateWorkloadData,
  saveSecrets,
} from '../lib/orchestrate-run-remote-server'

type UpdateServerCheck = () => Promise<unknown> | unknown

export function useUpdateServer(
  serverName: string,
  options?: {
    onSecretSuccess?: (completedCount: number, secretsCount: number) => void
    onSecretError?: (
      error: string,
      variables: Options<PostApiV1BetaSecretsDefaultKeysData>
    ) => void
  }
) {
  const toastIdRef = useRef(new Date(Date.now()).toISOString())
  const queryClient = useQueryClient()

  const { mutateAsync: updateWorkload } = useMutation({
    ...postApiV1BetaWorkloadsByNameEditMutation(),
  })

  const { mutateAsync: saveSecret } = useMutation({
    ...postApiV1BetaSecretsDefaultKeysMutation(),
  })

  const handleSettled = useCallback<UpdateServerCheck>(async () => {
    toast.loading(`Updating "${serverName}"...`, {
      duration: 30_000,
      id: toastIdRef.current,
    })

    const isServerReady = await pollServerStatus(
      () =>
        queryClient.fetchQuery(
          getApiV1BetaWorkloadsByNameStatusOptions({
            path: { name: serverName },
          })
        ),
      'running'
    )

    if (isServerReady) {
      await queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })

      toast.success(`"${serverName}" updated successfully.`, {
        id: toastIdRef.current,
        duration: 5_000,
        action: (
          <Button asChild>
            <Link
              to="/group/$groupName"
              params={{ groupName: 'default' }}
              search={{ newServerName: serverName }}
              onClick={() => toast.dismiss(toastIdRef.current)}
              viewTransition={{ types: ['slide-left'] }}
              className="ml-auto"
            >
              View
            </Link>
          </Button>
        ),
      })
    } else {
      toast.warning(
        `Server "${serverName}" was updated but may still be restarting. Check the servers list to monitor its status.`,
        {
          id: toastIdRef.current,
          duration: 5_000,
        }
      )
    }
  }, [queryClient, serverName])

  const { mutate: updateServerMutation } = useMutation({
    mutationFn: async ({ data }: { data: FormSchemaRemoteMcp }) => {
      let newlyCreatedSecrets: SecretsSecretParameter[] = []

      // Step 1: Group secrets into new and existing
      const definedSecrets = getDefinedSecrets(data.secrets)
      const { existingSecrets, newSecrets } = groupSecrets(definedSecrets)

      // Step 2: Fetch existing secrets & handle naming collisions
      const { data: fetchedSecrets } = await getApiV1BetaSecretsDefaultKeys({
        throwOnError: true,
      })
      const preparedNewSecrets = prepareSecretsWithoutNamingCollision(
        newSecrets,
        fetchedSecrets
      )

      // Step 3: Encrypt secrets
      if (preparedNewSecrets.length > 0) {
        newlyCreatedSecrets = await saveSecrets(
          preparedNewSecrets,
          saveSecret,
          options?.onSecretSuccess || (() => {}),
          options?.onSecretError || (() => {})
        )
      }

      // Step 4: Update the workload with all secrets
      const allSecrets = [
        ...newlyCreatedSecrets,
        ...existingSecrets.map((secret) => ({
          name: secret.value.secret,
          target: secret.name,
        })),
      ]
      const updateRequest = prepareUpdateWorkloadData(data, allSecrets)

      await updateWorkload({
        path: { name: serverName },
        body: updateRequest,
      })
      await restartClientNotification({
        queryClient,
      })
      trackEvent(`Workload ${serverName} updated`, {
        workload: serverName,
        'route.pathname': '/customize-tools',
      })
    },
  })

  return {
    updateServerMutation,
    checkServerStatus: handleSettled,
  }
}
