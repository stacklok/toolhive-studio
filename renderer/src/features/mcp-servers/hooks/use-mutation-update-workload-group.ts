import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { postApiV1BetaWorkloadsMutation } from '@api/@tanstack/react-query.gen'
import { getApiV1BetaRegistryByNameServersByServerName } from '@api/sdk.gen'
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
      // Get the current server configuration
      const serverResponse =
        await getApiV1BetaRegistryByNameServersByServerName({
          path: { name: 'default', serverName: workloadName },
          parseAs: 'text',
          responseStyle: 'data',
        })

      const serverData =
        typeof serverResponse === 'string'
          ? JSON.parse(serverResponse)
          : serverResponse
      const server = serverData.server

      if (!server) {
        throw new Error(`Server "${workloadName}" not found`)
      }

      // Create a new workload with the same configuration
      // Note: Group assignment is not yet supported in the current API version
      // This will create the workload in the default group
      const result = await createWorkload({
        body: {
          name: `${workloadName}-${groupName}`, // Use a unique name to avoid conflicts
          image: server.image,
          transport: server.transport,
          target_port: server.target_port,
          env_vars: server.env_vars || {},
          secrets: server.secrets || [],
          cmd_arguments: server.cmd_arguments || [],
          volumes: server.volumes || [],
          network_isolation: server.network_isolation || false,
          permission_profile: server.permission_profile,
        },
      })

      return result
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaWorkloadsQueryKey(),
      })
      queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'groups'] })
    },
    successMsg: (variables) =>
      `Server "${variables.workloadName}" copied successfully (group assignment not yet supported)`,
    loadingMsg: 'Copying server...',
  })
}
