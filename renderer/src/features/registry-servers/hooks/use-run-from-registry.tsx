import {
  getApiV1BetaSecretsDefaultKeys,
  type RegistryImageMetadata,
  type SecretsSecretParameter,
  type V1CreateRequest,
  type V1CreateWorkloadResponse,
} from '@/common/api/generated'
import {
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsByNameOptions,
  postApiV1BetaSecretsDefaultKeysMutation,
  getApiV1BetaWorkloadsQueryKey,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { pollServerStatus } from '@/common/lib/polling'
import {
  useMutation,
  useQueryClient,
  type UseMutateFunction,
} from '@tanstack/react-query'
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

export type InstallServerMutation = UseMutateFunction<
  V1CreateWorkloadResponse | undefined,
  Error,
  {
    server: RegistryImageMetadata
    data: FormSchemaRunFromRegistry
  },
  unknown
>

export type InstallServerCheck = (
  data: FormSchemaRunFromRegistry
) => Promise<unknown> | unknown

export function useRunFromRegistry() {
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
      console.debug('👉 handleSettled')

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

  const { mutate: installServer } = useMutation({
    mutationFn: async ({
      server,
      data,
    }: {
      server: RegistryImageMetadata
      data: FormSchemaRunFromRegistry
    }) => {
      console.debug('👉 server:', server)
      console.debug('👉 data:', data)
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
      }).catch((e) => {
        toast.error(
          [
            `An error occurred while starting the server.`,
            'Could not retrieve secrets from the secret store.',
            e instanceof Error ? `\n${e.message}` : null,
          ].join('\n'),
          {
            id: toastIdRef.current,
          }
        )
        throw e
      })
      const preparedNewSecrets = prepareSecretsWithoutNamingCollision(
        newSecrets,
        fetchedSecrets
      )

      // Step 3: Encrypt secrets
      // If there are secrets with values, create them in the secret store first.
      // We need the data returned by the API to pass along with the "run workload" request.
      if (preparedNewSecrets.length > 0) {
        try {
          newlyCreatedSecrets = await saveSecrets(
            preparedNewSecrets,
            saveSecret,
            toastIdRef.current
          )
        } catch (error) {
          toast.error(
            [
              'An error occurred while starting the server.',
              error instanceof Error ? `\n${error.message}` : null,
            ].join(''),
            {
              id: toastIdRef.current,
            }
          )
          return
        }
      }

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
    onError: (error) => {
      console.debug('👉 error:', error)
      toast.error(
        [
          'An error occurred while starting the server.',
          error instanceof Error ? `\n${error.message}` : null,
        ].join(''),
        {
          id: toastIdRef.current,
        }
      )
      return
    },
  })

  return {
    handleSubmit: installServer,
    checkServerStatus: handleSettled,
  }
}
