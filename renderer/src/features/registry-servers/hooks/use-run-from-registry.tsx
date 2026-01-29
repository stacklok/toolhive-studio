import {
  type PostApiV1BetaSecretsDefaultKeysData,
  type RegistryImageMetadata,
  type SecretsSecretParameter,
  type V1CreateRequest,
} from '@common/api/generated/types.gen'
import { type Options } from '@common/api/generated/sdk.gen'
import { postApiV1BetaWorkloadsMutation } from '@common/api/generated/@tanstack/react-query.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { prepareCreateWorkloadData } from '../lib/orchestrate-run-registry-server'
import { trackEvent } from '@/common/lib/analytics'
import { restartClientNotification } from '@/features/mcp-servers/lib/restart-client-notification'
import type { FormSchemaRegistryMcp } from '../lib/form-schema-registry-mcp'
import { useMCPSecrets } from '@/common/hooks/use-mcp-secrets'
import { useNotificationOptimizer } from '@/features/mcp-servers/hooks/use-notification-optimizer'

export function useRunFromRegistry({
  onSecretSuccess,
  onSecretError,
  quietly = false,
}: {
  onSecretSuccess: (completedCount: number, secretsCount: number) => void
  onSecretError: (
    error: string,
    variables: Options<PostApiV1BetaSecretsDefaultKeysData>
  ) => void
  quietly?: boolean
}) {
  const queryClient = useQueryClient()
  const { handleSecrets, isPendingSecrets, isErrorSecrets } = useMCPSecrets({
    onSecretSuccess,
    onSecretError,
  })
  const notifyChangeWithOptimizer = useNotificationOptimizer()

  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
    onSuccess: async (data, variables) => {
      await restartClientNotification({
        queryClient,
        quietly,
      })
      const body: V1CreateRequest = variables.body
      const groupName = body.group || 'default'
      notifyChangeWithOptimizer(groupName, quietly)
      trackEvent(`Workload ${data.name} started`, {
        workload: data.name,
        is_default_group: String(groupName === 'default'),
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
