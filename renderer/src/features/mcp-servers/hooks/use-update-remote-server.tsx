import { postApiV1BetaWorkloadsByNameEditMutation } from '@api/@tanstack/react-query.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type PostApiV1BetaSecretsDefaultKeysData } from '@api/types.gen'
import type { Options } from '@api/client'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'
import { prepareUpdateWorkloadData } from '../lib/orchestrate-run-remote-server'
import { useMCPSecrets } from '@/common/hooks/use-mcp-secrets'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'

export function useUpdateRemoteServer(
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
  const { isPendingSecrets, isErrorSecrets } = useMCPSecrets({
    onSecretSuccess: options?.onSecretSuccess || (() => {}),
    onSecretError: options?.onSecretError || (() => {}),
  })

  const { mutateAsync: updateWorkload } = useMutation({
    ...postApiV1BetaWorkloadsByNameEditMutation(),
  })

  const { mutate: updateServerMutation } = useMutation({
    mutationFn: async ({ data }: { data: FormSchemaRemoteMcp }) => {
      const updateRequest = prepareUpdateWorkloadData(data)

      await updateWorkload({
        path: { name: serverName },
        body: updateRequest,
      })
      await restartClientNotification({
        queryClient,
      })
      trackEvent(`Workload remote ${serverName} updated`, {
        pageName: '/',
        isEditing: 'true',
        remote: 'true',
        auth_type: data.auth_type,
        transport: data.transport,
        workload: serverName,
        'route.pathname': '/',
      })
    },
  })

  return {
    updateServerMutation,
    isPendingSecrets,
    isErrorSecrets,
  }
}
