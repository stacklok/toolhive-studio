import { useToastMutation } from '@/common/hooks/use-toast-mutation'

export function useMutationUpdateWorkloadGroup() {
  return useToastMutation({
    mutationFn: async ({ workloadName, groupName }: { workloadName: string; groupName: string }) => {
      // TODO: Implement actual API call when backend is ready
      // For now, just simulate a successful response
      console.log(`Moving server "${workloadName}" to group "${groupName}"`)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return { success: true }
    },
    onSuccess: () => {
      // TODO: Invalidate relevant queries when API is implemented
      // queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'workloads'] })
      // queryClient.invalidateQueries({ queryKey: ['api', 'v1beta', 'groups'] })
    },
    successMsg: (variables) =>
      `Server "${variables.workloadName}" moved to group "${variables.groupName}" successfully`,
    loadingMsg: 'Moving server to group...',
  })
}
