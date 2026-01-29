import { postApiV1BetaWorkloadsMutation } from '@common/api/generated/@tanstack/react-query.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { type PostApiV1BetaSecretsDefaultKeysData } from '@common/api/generated/types.gen'
import type { Options } from '@common/api/generated/client'
import {
  prepareCreateWorkloadData,
  getHeaderForwardSecrets,
} from '../lib/orchestrate-run-remote-server'
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

/** Build the appropriate secrets based on auth type. */
const buildAuthSecret = (data: FormSchemaRemoteMcp) => {
  const isDefaultAuthType =
    data.auth_type === REMOTE_MCP_AUTH_TYPES.AutoDiscovered
  const isBearerAuth = data.auth_type === REMOTE_MCP_AUTH_TYPES.BearerToken

  // Get auth secrets
  const authSecrets = isDefaultAuthType
    ? data.secrets
    : isBearerAuth
      ? data.oauth_config.bearer_token
        ? [data.oauth_config.bearer_token]
        : []
      : data.oauth_config.client_secret
        ? [data.oauth_config.client_secret]
        : []

  // Get header_forward secrets
  const headerSecrets = getHeaderForwardSecrets(data.header_forward)

  return [...authSecrets, ...headerSecrets]
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
