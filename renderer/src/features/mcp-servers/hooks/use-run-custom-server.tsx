import {
  postApiV1BetaWorkloadsMutation,
  postApiV1BetaSecretsDefaultKeysMutation,
} from '@api/@tanstack/react-query.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type PostApiV1BetaSecretsDefaultKeysData,
  type SecretsSecretParameter,
  type V1CreateRequest,
} from '@api/types.gen'
import type { Options } from '@api/client'
import { getApiV1BetaSecretsDefaultKeys } from '@api/sdk.gen'
import { prepareSecretsWithoutNamingCollision } from '@/common/lib/secrets/prepare-secrets-without-naming-collision'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'
import type { FormSchemaLocalMcp } from '../lib/form-schema-local-mcp'
import { prepareCreateWorkloadData } from '../lib/orchestrate-run-local-server'
import { groupMCPDefinedSecrets, saveMCPSecrets } from '@/common/lib/utils'

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
  const queryClient = useQueryClient()

  const { mutateAsync: saveSecret } = useMutation({
    ...postApiV1BetaSecretsDefaultKeysMutation(),
  })
  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  const {
    mutateAsync: handleSecrets,
    isPending: isPendingSecrets,
    isError: isErrorSecrets,
  } = useMutation({
    mutationFn: async (data: FormSchemaLocalMcp) => {
      let newlyCreatedSecrets: SecretsSecretParameter[] = []

      // Step 1: Group secrets into new and existing
      // We need to know which secrets are new (not from the registry) and which are
      // existing (already stored). This helps us handle the encryption and storage
      // of secrets correctly.
      const { existingSecrets, newSecrets } = groupMCPDefinedSecrets(
        data.secrets
      )

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
        newlyCreatedSecrets = await saveMCPSecrets(
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
    mutationFn: async ({ data }: { data: FormSchemaLocalMcp }) => {
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
    isPendingSecrets,
    isErrorSecrets,
  }
}
