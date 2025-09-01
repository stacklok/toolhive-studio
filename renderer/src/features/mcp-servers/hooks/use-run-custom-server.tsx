import {
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsByNameStatusOptions,
  postApiV1BetaSecretsDefaultKeysMutation,
  getApiV1BetaWorkloadsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { pollServerStatus } from '@/common/lib/polling'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'

import type { FormSchemaRunMcpCommand } from '../lib/form-schema-run-mcp-server-with-command'
import {
  groupSecrets,
  prepareCreateWorkloadData,
  saveSecrets,
} from '../lib/orchestrate-run-custom-server'
import {
  type PostApiV1BetaSecretsDefaultKeysData,
  type SecretsSecretParameter,
  type V1CreateRequest,
} from '@api/types.gen'
import type { Options } from '@api/client'
import { getApiV1BetaSecretsDefaultKeys } from '@api/sdk.gen'
import { prepareSecretsWithoutNamingCollision } from '@/common/lib/secrets/prepare-secrets-without-naming-collision'
import { toast } from 'sonner'
import { Button } from '@/common/components/ui/button'
import { Link } from '@tanstack/react-router'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'

type InstallServerCheck = (
  data: FormSchemaRunMcpCommand
) => Promise<unknown> | unknown

export function useRunCustomServer({
  onSecretSuccess,
  onSecretError,
}: {
  onSecretSuccess: (completedCount: number, secretsCount: number) => void
  onSecretError: (
    error: string,
    variables: Options<PostApiV1BetaSecretsDefaultKeysData>
  ) => void
}) {
  const toastIdRef = useRef(new Date(Date.now()).toISOString())
  const queryClient = useQueryClient()

  const { mutateAsync: saveSecret } = useMutation({
    ...postApiV1BetaSecretsDefaultKeysMutation(),
  })
  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  const handleSettled = useCallback<InstallServerCheck>(
    async (formData) => {
      toast.loading(`Starting "${formData.name}"...`, {
        duration: 30_000,
        id: toastIdRef.current,
      })

      const isServerReady = await pollServerStatus(
        () =>
          queryClient.fetchQuery(
            getApiV1BetaWorkloadsByNameStatusOptions({
              path: { name: formData.name },
            })
          ),
        'running'
      )

      if (isServerReady) {
        await queryClient.invalidateQueries({
          queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
        })

        toast.success(`"${formData.name}" started successfully.`, {
          id: toastIdRef.current,
          duration: 5_000, // slightly longer than default
          action: (
            <Button asChild>
              <Link
                to="/"
                search={{ newServerName: formData.name }}
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
          `Server "${formData.name}" was created but may still be starting up. Check the servers list to monitor its status.`,
          {
            id: toastIdRef.current,
            duration: 5_000,
          }
        )
      }
    },
    [queryClient]
  )

  const {
    mutateAsync: handleSecrets,
    isPending: isPendingSecrets,
    isError: isErrorSecrets,
  } = useMutation({
    mutationFn: async (data: FormSchemaRunMcpCommand) => {
      let newlyCreatedSecrets: SecretsSecretParameter[] = []

      // Step 1: Group secrets into new and existing
      // We need to know which secrets are new (not from the registry) and which are
      // existing (already stored). This helps us handle the encryption and storage
      // of secrets correctly.
      const { existingSecrets, newSecrets } = groupSecrets(data.secrets)

      // Step 2: Fetch existing secrets & handle naming collisions
      // We need an up-to-date list of secrets so we can handle any existing keys
      // safely & correctly. This is done with a manual fetch call to avoid freshness issues /
      // side-effects from the `useQuery` hook.
      // In the event of a naming collision, we will append an incrementing number
      // to the secret name, e.g. `MY_API_TOKEN` -> `MY_API_TOKEN_2`
      const { data: fetchedSecrets } = await getApiV1BetaSecretsDefaultKeys({
        throwOnError: true,
      })
      const preparedNewSecrets = prepareSecretsWithoutNamingCollision(
        newSecrets,
        fetchedSecrets
      )

      // Step 3: Encrypt secrets
      // If there are secrets with values, create them in the secret store first.
      // We need the data returned by the API to pass along with the "run workload" request.
      if (preparedNewSecrets.length > 0) {
        newlyCreatedSecrets = await saveSecrets(
          preparedNewSecrets,
          saveSecret,
          onSecretSuccess,
          onSecretError
        )
      }

      return {
        newlyCreatedSecrets,
        existingSecrets,
      }
    },
  })

  const { mutate: installServerMutation } = useMutation({
    mutationFn: async ({ data }: { data: FormSchemaRunMcpCommand }) => {
      const { newlyCreatedSecrets, existingSecrets } = await handleSecrets(data)
      // Step 4: Create the MCP server workload
      // Prepare the request data and send it to the API
      // We pass the encrypted secrets along with the request.
      const secretsForRequest: SecretsSecretParameter[] = [
        ...newlyCreatedSecrets,
        ...existingSecrets,
      ]

      const createRequest: V1CreateRequest = prepareCreateWorkloadData(
        data,
        secretsForRequest
      )

      await createWorkload({
        body: createRequest,
      })
      await restartClientNotification({
        queryClient,
      })
      trackEvent(`Workload ${data.name} started`, {
        workload: data.name,
        transport: data.transport,
        'route.pathname': '/',
      })
    },
  })

  return {
    installServerMutation,
    checkServerStatus: handleSettled,
    isPendingSecrets,
    isErrorSecrets,
  }
}
