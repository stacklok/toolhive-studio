import {
  type PostApiV1BetaSecretsDefaultKeysData,
  type RegistryImageMetadata,
  type SecretsSecretParameter,
  type V1CreateRequest,
} from '@api/types.gen'
import { getApiV1BetaSecretsDefaultKeys, type Options } from '@api/sdk.gen'
import {
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsByNameOptions,
  postApiV1BetaSecretsDefaultKeysMutation,
  getApiV1BetaWorkloadsQueryKey,
} from '@api/@tanstack/react-query.gen'
import { pollServerStatus } from '@/common/lib/polling'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormSchemaRunFromRegistry } from '../lib/get-form-schema-run-from-registry'
import { useCallback, useRef } from 'react'
import {
  getDefinedSecrets,
  groupSecrets,
  prepareCreateWorkloadData,
  saveSecrets,
} from '../lib/orchestrate-run-registry-server'
import { toast } from 'sonner'
import { Button } from '@/common/components/ui/button'
import { prepareSecretsWithoutNamingCollision } from '@/common/lib/secrets/prepare-secrets-without-naming-collision'
import { Link } from '@tanstack/react-router'
import { trackEvent } from '@/common/lib/analytics'
import { restartClientNotification } from '@/features/mcp-servers/lib/restart-client-notification'

type InstallServerCheck = (
  data: FormSchemaRunFromRegistry
) => Promise<unknown> | unknown

export function useRunFromRegistry({
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
    onSuccess: async (data) => {
      await restartClientNotification({
        queryClient,
      })
      trackEvent(`Workload ${data.name} started`, {
        workload: data.name,
        'route.pathname': '/registry',
      })
    },
  })

  const handleSettled = useCallback<InstallServerCheck>(
    async (formData) => {
      toast.loading(`Starting "${formData.serverName}"...`, {
        duration: 30_000,
        id: toastIdRef.current,
      })

      const isServerReady = await pollServerStatus(
        () =>
          queryClient.fetchQuery(
            getApiV1BetaWorkloadsByNameOptions({
              path: { name: formData.serverName },
            })
          ),
        'running'
      )

      if (isServerReady) {
        await queryClient.invalidateQueries({
          queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
        })

        toast.success(`"${formData.serverName}" started successfully.`, {
          id: toastIdRef.current,
          duration: 5_000, // slightly longer than default
          action: (
            <Button asChild>
              <Link
                to="/"
                search={{ newServerName: formData.serverName }}
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
          `Server "${formData.serverName}" was created but may still be starting up. Check the servers list to monitor its status.`,
          {
            id: toastIdRef.current,
            duration: 2_000, // reset to default
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
    mutationFn: async (data: FormSchemaRunFromRegistry) => {
      let newlyCreatedSecrets: SecretsSecretParameter[] = []

      // NOTE: Due to how we populate the names of the secrets in the form, we may
      // have secrets with a `key` but no `value`. We filter those out.
      const definedSecrets = getDefinedSecrets(data.secrets)

      // Step 1: Group secrets into new and existing
      // We need to know which secrets are new (not from the registry) and which are
      // existing (already stored). This helps us handle the encryption and storage
      // of secrets correctly.
      const { existingSecrets, newSecrets } = groupSecrets(definedSecrets)

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
    mutationFn: async ({
      server,
      data,
    }: {
      server: RegistryImageMetadata
      data: FormSchemaRunFromRegistry
    }) => {
      const { newlyCreatedSecrets, existingSecrets } = await handleSecrets(data)

      // Step 4: Create the MCP server workload
      // Prepare the request data and send it to the API
      // We pass the encrypted secrets along with the request.
      const secretsForRequest: SecretsSecretParameter[] = [
        ...newlyCreatedSecrets,
        ...existingSecrets.map((secret) => ({
          name: secret.value.secret,
          target: secret.name,
        })),
      ]

      const createRequest: V1CreateRequest = prepareCreateWorkloadData(
        server,
        data,
        secretsForRequest
      )

      const response = await createWorkload({
        body: createRequest,
      })
      return response
    },
  })

  return {
    installServerMutation,
    checkServerStatus: handleSettled,
    isPendingSecrets,
    isErrorSecrets,
  }
}
