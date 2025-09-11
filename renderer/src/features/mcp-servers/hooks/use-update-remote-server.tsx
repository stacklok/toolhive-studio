import {
  postApiV1BetaWorkloadsByNameEditMutation,
  postApiV1BetaSecretsDefaultKeysMutation,
} from '@api/@tanstack/react-query.gen'
import { getApiV1BetaSecretsDefaultKeys } from '@api/sdk.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type PostApiV1BetaSecretsDefaultKeysData,
  type SecretsSecretParameter,
} from '@api/types.gen'
import type { Options } from '@api/client'
import type { FormSchemaRemoteMcp } from '../lib/form-schema-remote-mcp'
import { prepareSecretsWithoutNamingCollision } from '@/common/lib/secrets/prepare-secrets-without-naming-collision'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'
import { prepareUpdateWorkloadData } from '../lib/orchestrate-run-remote-server'
import {
  getMCPDefinedSecrets,
  groupMCPDefinedSecrets,
  saveMCPSecrets,
} from '@/common/lib/utils'

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
  const queryClient = useQueryClient()

  const { mutateAsync: updateWorkload } = useMutation({
    ...postApiV1BetaWorkloadsByNameEditMutation(),
  })

  const { mutateAsync: saveSecret } = useMutation({
    ...postApiV1BetaSecretsDefaultKeysMutation(),
  })

  const { mutate: updateServerMutation } = useMutation({
    mutationFn: async ({ data }: { data: FormSchemaRemoteMcp }) => {
      let newlyCreatedSecrets: SecretsSecretParameter[] = []

      // Step 1: Group secrets into new and existing
      const definedSecrets = getMCPDefinedSecrets(data.secrets)
      const { existingSecrets, newSecrets } =
        groupMCPDefinedSecrets(definedSecrets)

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
        newlyCreatedSecrets = await saveMCPSecrets(
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
  }
}
