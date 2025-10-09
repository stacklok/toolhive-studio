import { postApiV1BetaWorkloadsMutation } from '@api/@tanstack/react-query.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { prepareCreateWorkloadData } from '../lib/orchestrate-run-remote-server'
import { type PostApiV1BetaSecretsDefaultKeysData } from '@api/types.gen'
import type { Options } from '@api/client'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'
import { useMCPSecrets } from '@/common/hooks/use-mcp-secrets'

interface UseRunRemoteServerProps {
  pageName: string
  onSecretSuccess: (completedCount: number, secretsCount: number) => void
  onSecretError: (
    error: string,
    variables: Options<PostApiV1BetaSecretsDefaultKeysData>
  ) => void
}

export function useRunRemoteServer({
  pageName,
  onSecretSuccess,
  onSecretError,
}: UseRunRemoteServerProps) {
  const queryClient = useQueryClient()
  const { handleSecrets, isPendingSecrets, isErrorSecrets } = useMCPSecrets({
    onSecretSuccess,
    onSecretError,
  })

  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  const { mutate: installServerMutation } = useMutation({
    mutationFn: async ({ data }: { data: FormSchemaRemoteMcp }) => {
      const isDefaultAuthType = data.auth_type === 'none'
      const secrets = isDefaultAuthType
        ? data.secrets
        : data.oauth_config.client_secret
          ? [data.oauth_config.client_secret]
          : []

      await handleSecrets(secrets)

      const preparedData = prepareCreateWorkloadData(data)

      await createWorkload({
        body: preparedData,
      })
      await restartClientNotification({
        queryClient,
      })
      trackEvent(`Workload remote ${data.name} started`, {
        remote: 'true',
        auth_type: data.auth_type,
        transport: data.transport,
        workload: data.name,
        is_default_group: data.group === 'default',
        'route.pathname': pageName,
      })
    },
  })

  return {
    installServerMutation,
    isPendingSecrets,
    isErrorSecrets,
  }
}
