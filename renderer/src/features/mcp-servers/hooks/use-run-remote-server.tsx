import { postApiV1BetaWorkloadsMutation } from '@api/@tanstack/react-query.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { prepareCreateWorkloadData } from '../lib/orchestrate-run-remote-server'
import { type PostApiV1BetaSecretsDefaultKeysData } from '@api/types.gen'
import type { Options } from '@api/client'
import { restartClientNotification } from '../lib/restart-client-notification'
import { trackEvent } from '@/common/lib/analytics'
import { useMCPSecrets } from '@/common/hooks/use-mcp-secrets'
import { useNotificationOptimizer } from './use-notification-optimizer'
import { REMOTE_MCP_AUTH_TYPES } from '@/common/lib/form-schema-mcp'

interface UseRunRemoteServerProps {
  pageName: string
  onSecretSuccess: (completedCount: number, secretsCount: number) => void
  onSecretError: (
    error: string,
    variables: Options<PostApiV1BetaSecretsDefaultKeysData>
  ) => void
  quietly?: boolean
}

const buildAuthSecret = (data: FormSchemaRemoteMcp) => {
  const isDefaultAuthType = data.auth_type === REMOTE_MCP_AUTH_TYPES.None
  const isBearerAuth = data.auth_type === REMOTE_MCP_AUTH_TYPES.BearerToken
  if (isDefaultAuthType) return data.secrets
  if (isBearerAuth)
    return data.oauth_config.bearer_token
      ? [data.oauth_config.bearer_token]
      : []
  if (data.oauth_config.client_secret) return [data.oauth_config.client_secret]
  return []
}

export function useRunRemoteServer({
  pageName,
  onSecretSuccess,
  onSecretError,
  quietly = false,
}: UseRunRemoteServerProps) {
  const queryClient = useQueryClient()
  const { handleSecrets, isPendingSecrets, isErrorSecrets } = useMCPSecrets({
    onSecretSuccess,
    onSecretError,
  })
  const notifyChangeWithOptimizer = useNotificationOptimizer()

  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  const { mutate: installServerMutation } = useMutation({
    mutationFn: async ({ data }: { data: FormSchemaRemoteMcp }) => {
      const secrets = buildAuthSecret(data)
      const { newlyCreatedSecrets } = await handleSecrets(secrets)

      const preparedData = prepareCreateWorkloadData(data, newlyCreatedSecrets)

      await createWorkload({
        body: preparedData,
      })
      await restartClientNotification({
        queryClient,
        quietly,
      })
      notifyChangeWithOptimizer(data.group, quietly)
      trackEvent(`Workload remote ${data.name} started`, {
        remote: 'true',
        auth_type: data.auth_type,
        transport: data.transport,
        workload: data.name,
        is_default_group: String(data.group === 'default'),
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
