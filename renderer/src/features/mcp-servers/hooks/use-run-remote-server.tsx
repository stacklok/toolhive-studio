import { postApiV1BetaWorkloadsMutation } from '@api/@tanstack/react-query.gen'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormSchemaRemoteMcp } from '@/common/lib/workloads/remote/form-schema-remote-mcp'
import { prepareCreateWorkloadData } from '../lib/orchestrate-run-remote-server'
import {
  type PostApiV1BetaSecretsDefaultKeysData,
  type SecretsSecretParameter,
  type V1CreateRequest,
} from '@api/types.gen'
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
  groupName: string
}

export function useRunRemoteServer({
  pageName,
  onSecretSuccess,
  onSecretError,
  groupName,
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

      const { newlyCreatedSecrets, existingSecrets } =
        await handleSecrets(secrets)
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
        ...prepareCreateWorkloadData(
          data,
          isDefaultAuthType ? secretsForRequest : []
        ),
        ...(groupName ? { group: groupName } : {}),
      }
      await createWorkload({
        body: createRequest,
      })
      await restartClientNotification({
        queryClient,
      })
      trackEvent(`Workload remote ${data.name} started`, {
        remote: 'true',
        auth_type: data.auth_type,
        transport: data.transport,
        workload: data.name,
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
