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
      customName,
    }: {
      workloadName: string
      groupName: string
      customName?: string
    }) => {
      const { data: runConfig } = await getApiV1BetaWorkloadsByNameExport({
        path: { name: workloadName },
        throwOnError: true,
      })

      const secrets = (runConfig.secrets || []).map((secretStr) => {
        const [secretName, target] = secretStr.split(',target=')

        return {
          name: secretName,
          target: target,
        }
      })

      const result = await createWorkload({
        body: {
          name: customName || `${runConfig.name}-${groupName}`,
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
    errorMsg: 'Failed to copy server to group',
    loadingMsg: 'Copying server to group...',
  })
}
