import { postApiV1BetaWorkloadsByNameEditMutation } from '@api/@tanstack/react-query.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type PostApiV1BetaSecretsDefaultKeysData } from '@api/types.gen'
import type { Options } from '@api/client'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'
import { prepareUpdateWorkloadData } from '../lib/orchestrate-run-local-server'
import type { FormSchemaLocalMcp } from '../lib/form-schema-local-mcp'
import { useMCPSecrets } from '@/common/hooks/use-mcp-secrets'

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
  const { handleSecrets, isPendingSecrets, isErrorSecrets } = useMCPSecrets({
    onSecretSuccess: options?.onSecretSuccess || (() => {}),
    onSecretError: options?.onSecretError || (() => {}),
  })

  const { mutateAsync: updateWorkload } = useMutation({
    ...postApiV1BetaWorkloadsByNameEditMutation(),
  })

  const { mutate: updateServerMutation } = useMutation({
    mutationFn: async ({ data }: { data: FormSchemaLocalMcp }) => {
      const { newlyCreatedSecrets, existingSecrets } = await handleSecrets(
        data.secrets
      )

      // Update the workload with all secrets
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
    isPendingSecrets,
    isErrorSecrets,
  }
}
