import { postApiV1BetaWorkloadsMutation } from '@api/@tanstack/react-query.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type PostApiV1BetaSecretsDefaultKeysData,
  type SecretsSecretParameter,
  type V1CreateRequest,
} from '@api/types.gen'
import type { Options } from '@api/client'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'
import type { FormSchemaLocalMcp } from '../lib/form-schema-local-mcp'
import { prepareCreateWorkloadData } from '../lib/orchestrate-run-local-server'
import { useMCPSecrets } from '@/common/hooks/use-mcp-secrets'

export function useRunCustomServer({
  onSecretSuccess,
  onSecretError,
  groupName,
}: {
  onSecretSuccess: (completedCount: number, secretsCount: number) => void
  onSecretError: (
    error: string,
    variables: Options<PostApiV1BetaSecretsDefaultKeysData>
  ) => void
  groupName: string
}) {
  const queryClient = useQueryClient()
  const { handleSecrets, isPendingSecrets, isErrorSecrets } = useMCPSecrets({
    onSecretSuccess,
    onSecretError,
  })

  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  const { mutate: installServerMutation } = useMutation({
    mutationFn: async ({ data }: { data: FormSchemaLocalMcp }) => {
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

      const group = data.group ?? groupName
      const createRequest: V1CreateRequest = {
        ...prepareCreateWorkloadData(data, secretsForRequest),
        ...(group ? { group } : {}),
      }

      await createWorkload({
        body: createRequest,
      })
      await restartClientNotification({
        queryClient,
      })
      trackEvent(`Workload ${data.name} started`, {
        workload: data.name,
        transport: data.transport,
        type: data.type,
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
