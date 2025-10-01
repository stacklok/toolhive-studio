import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { postApiV1BetaWorkloadsMutation } from '@api/@tanstack/react-query.gen'
import {
  getApiV1BetaWorkloadsByNameExport,
  getApiV1BetaWorkloads,
} from '@api/sdk.gen'
import { getApiV1BetaWorkloadsQueryKey } from '@api/@tanstack/react-query.gen'
import { useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'

export function useMutationUpdateWorkloadGroup() {
  const queryClient = useQueryClient()

  const { mutateAsync: createWorkload } = useMutation({
    ...postApiV1BetaWorkloadsMutation(),
  })

  return useToastMutation({
    mutationFn: async ({
      workloadName,
      groupName,
    }: {
      workloadName: string
      groupName: string
    }) => {
      const { data: runConfig } = await getApiV1BetaWorkloadsByNameExport({
        path: { name: workloadName },
        throwOnError: true,
      })

      const newServerName = `${runConfig.name}-${groupName}`

      // Check if server already exists (across all groups, since names must be globally unique)
      const { data: existingWorkloads } = await getApiV1BetaWorkloads({
        query: { all: true },
        throwOnError: true,
      })

      console.log('[Copy Server] Checking for existing server:', {
        newServerName,
        existingWorkloadNames: existingWorkloads?.workloads?.map((w) => w.name),
      })

      const serverExists = existingWorkloads?.workloads?.some(
        (w) => w.name === newServerName
      )

      console.log('[Copy Server] Server exists?', serverExists)

      if (serverExists) {
        throw new Error(
          `Server "${newServerName}" already exists. Please remove the existing server first or choose a different group name.`
        )
      }

      const secrets = (runConfig.secrets || []).map((secretStr) => {
        const [secretName, target] = secretStr.split(',target=')

        return {
          name: secretName,
          target: target,
        }
      })

      const result = await createWorkload({
        body: {
          name: newServerName,
          image: runConfig.image,
          transport: runConfig.transport,
          cmd_arguments: runConfig.cmd_args || [],
          env_vars: runConfig.env_vars || {},
          secrets: secrets,
          volumes: runConfig.volumes || [],
          network_isolation: runConfig.isolate_network || false,
          permission_profile: runConfig.permission_profile,
          host: runConfig.host,
          target_port: runConfig.target_port,
          group: groupName,
        },
      })

      await queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey({ query: { all: true } }),
      })

      return result
    },
    successMsg: (variables) =>
      `Server "${variables.workloadName}" copied to group "${variables.groupName}" successfully`,
    loadingMsg: 'Copying server to group...',
  })
}
