import type {
  RegistryServer,
  SecretsSecretParameter,
  V1CreateRequest,
} from '@/common/api/generated'
import {
  postApiV1BetaWorkloadsMutation,
  getApiV1BetaWorkloadsByNameOptions,
} from '@/common/api/generated/@tanstack/react-query.gen'
import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { pollServerStatus } from '@/common/lib/polling'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FormSchemaRunFromRegistry } from '../lib/get-form-schema-run-from-registry'

function transformData(
  server: RegistryServer,
  data: FormSchemaRunFromRegistry
): V1CreateRequest {
  const envVars: Array<string> = data.envVars.map(
    (envVar) => `${envVar.name}=${envVar.value}`
  )

  const secrets: SecretsSecretParameter[] = data.secrets.map((secret) => ({
    name: secret.name,
    value: secret.value,
  }))

  return {
    name: data.serverName,
    image: server.image,
    transport: server.transport,
    env_vars: envVars,
    secrets,
    cmd_arguments: server.args,
    target_port: server.target_port,
  }
}

function countSecretsToSave(secrets: FormSchemaRunFromRegistry['secrets']) {
  return secrets.reduce((count, secret) => {
    if (secret.value) count++
    return count
  }, 0)
}

export function useRunFromRegistry() {
  const queryClient = useQueryClient()

  // NOTE: This is simulated today
  const { mutateAsync: saveSecret } = useMutation({
    mutationFn: async ({ name, target }: SecretsSecretParameter) => {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * 4000) + 1000)
      )
      return { key: name, value: target }
    },
  })

  const { mutateAsync } = useToastMutation({
    ...postApiV1BetaWorkloadsMutation(),
    loadingMsg: 'Creating server...',
    errorMsg: 'Failed to create server',
  })

  const handleSubmit = async (
    server: RegistryServer,
    data: FormSchemaRunFromRegistry
  ) => {
    const toastID = server.name
    const countSecrets: number = countSecretsToSave(data.secrets)
    let secretKeys: string[] = []

    /**
     * Step 1: Encrypt secrets
     * If there are secrets with values, create them in the secret store first.
     * We need the keys returned by the API to pass along with the "run workload" request.
     */

    if (countSecrets > 0) {
      toast.loading(`Encrypting secrets (0 of ${countSecrets})...`, {
        id: toastID,
        duration: 30_000, // 30 second timeout
      })

      let completedSecrets = 0

      secretKeys = await Promise.all(
        data.secrets.map(async ({ name, value }) => {
          const { key } = await saveSecret({ name, target: value })

          if (key == null) {
            toast.error(
              `Failed to encrypt secret "${name}". Please try again.`,
              {
                id: toastID,
              }
            )
            throw new Error(`Failed to encrypt secret "${name}"`)
          }

          completedSecrets++
          toast.loading(
            `Encrypting secrets (${completedSecrets} of ${countSecrets})...`,
            {
              id: toastID,
              duration: 30_000, // 30 second timeout
            }
          )

          return key
        })
      )
    }

    try {
      const createRequest: V1CreateRequest = transformData(server, data)

      await mutateAsync({
        body: createRequest,
      })

      const serverName = data.serverName

      toast.loading(`Waiting for server "${serverName}" to be ready...`, {
        duration: 30000, // 30 second timeout
        id: toastID,
      })

      const isServerReady = await pollServerStatus(() =>
        queryClient.fetchQuery(
          getApiV1BetaWorkloadsByNameOptions({ path: { name: serverName } })
        )
      )

      if (isServerReady) {
        toast.success(`Server "${serverName}" is now running and ready!`, {
          duration: 4000,
          id: toastID,
        })

        // Invalidate queries to refresh server lists
        queryClient.invalidateQueries({
          // @ts-expect-error - https://github.com/stacklok/toolhive/issues/497
          queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
        })
      } else {
        toast.warning(
          `Server "${serverName}" was created but may still be starting up. Check the servers list to monitor its status.`,
          {
            duration: 4000,
            id: toastID,
          }
        )
      }
    } catch (error) {
      console.error('Server creation failed:', error)
      // Error is already handled by useToastMutation
    }
  }

  return {
    handleSubmit,
  }
}
