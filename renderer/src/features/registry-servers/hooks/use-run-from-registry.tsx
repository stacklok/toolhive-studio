import {
  type PostApiV1BetaSecretsDefaultKeysData,
  type RegistryImageMetadata,
  type SecretsSecretParameter,
  type V1CreateRequest,
} from '@api/types.gen'
import { type Options } from '@api/sdk.gen'
import { postApiV1BetaWorkloadsMutation } from '@api/@tanstack/react-query.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { prepareCreateWorkloadData } from '../lib/orchestrate-run-registry-server'
import { trackEvent } from '@/common/lib/analytics'
import { restartClientNotification } from '@/features/mcp-servers/lib/restart-client-notification'
import type { FormSchemaRegistryMcp } from '../lib/form-schema-registry-mcp'
import { useMCPSecrets } from '@/common/hooks/use-mcp-secrets'

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
  const queryClient = useQueryClient()
  const { handleSecrets, isPendingSecrets, isErrorSecrets } = useMCPSecrets({
    onSecretSuccess,
    onSecretError,
  })

  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
    onSuccess: async (data, variables) => {
      await restartClientNotification({
        queryClient,
      })
      const groupName = variables.body.group || 'default'
      trackEvent(`Workload ${data.name} started`, {
        workload: data.name,
        isDefaultGroup: groupName === 'default',
        'route.pathname': '/registry',
      })
    },
  })

  const { mutate: installServerMutation } = useMutation({
    mutationFn: async ({
      server,
      data,
      groupName,
    }: {
      server: RegistryImageMetadata
      data: FormSchemaRegistryMcp
      groupName?: string
    }) => {
      const { newlyCreatedSecrets, existingSecrets } = await handleSecrets(
        data.secrets
      )

      // Create the MCP server workload
      // Prepare the request data and send it to the API
      // We pass the encrypted secrets along with the request.
      const secretsForRequest: SecretsSecretParameter[] = [
        ...newlyCreatedSecrets,
        ...existingSecrets.map((secret) => ({
          name: secret.value.secret,
          target: secret.name,
        })),
      ]

      const createRequest: V1CreateRequest = {
        ...prepareCreateWorkloadData(server, data, secretsForRequest),
        ...(groupName ? { group: groupName } : {}),
      }

      const response = await createWorkload({
        body: createRequest,
      })
      return response
    },
  })

  return {
    installServerMutation,
    isPendingSecrets,
    isErrorSecrets,
  }
}
