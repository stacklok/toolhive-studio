import { useToastMutation } from '@/common/hooks/use-toast-mutation'
import { postApiV1BetaWorkloadsMutation } from '@api/@tanstack/react-query.gen'
import { getApiV1BetaWorkloadsByNameExport } from '@api/sdk.gen'
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
      // Get the current workload configuration using the export endpoint
      const { data: runConfig } = await getApiV1BetaWorkloadsByNameExport({
        path: { name: workloadName },
      })

      if (!runConfig) {
        throw new Error(`Workload "${workloadName}" not found`)
      }

      // Create a new workload with the same configuration but in the specified group
      // Generate a new name to avoid conflicts
      const newWorkloadName = `${runConfig.name}-${groupName}`

      // Convert secrets from string format to SecretsSecretParameter format
      const secrets = (runConfig.secrets || []).map((secretStr) => {
        // Parse secret string format: "secret_name,target=env_var_name"
        const parts = secretStr.split(',')
        const secretName = parts[0] || ''
        const target =
          parts.find((part) => part.startsWith('target='))?.split('=')[1] ||
          secretName

        return {
          name: secretName,
          target: target,
        }
      })

      const result = await createWorkload({
        body: {
          name: newWorkloadName,
          image: runConfig.image,
          transport: runConfig.transport,
          cmd_arguments: runConfig.cmd_args || [],
          env_vars: runConfig.env_vars || {},
          secrets,
          volumes: runConfig.volumes || [],
          network_isolation: runConfig.isolate_network || false,
          permission_profile: runConfig.permission_profile,
          host: runConfig.host,
          target_port: runConfig.target_port,
          group: groupName,
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
