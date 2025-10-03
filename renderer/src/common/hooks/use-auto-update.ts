import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToastMutation } from './use-toast-mutation'

export function useAutoUpdateStatus() {
  return useQuery({
    queryKey: ['auto-update-status'],
    queryFn: window.electronAPI.isAutoUpdateEnabled,
  })
}

export function useSetAutoUpdate() {
  const queryClient = useQueryClient()

  return useToastMutation({
    mutationFn: (enabled: boolean) => window.electronAPI.setAutoUpdate(enabled),
    onSuccess: () => {
      // Invalidate and refetch the auto-update status
      queryClient.invalidateQueries({ queryKey: ['auto-update-status'] })
    },
    successMsg: (enabled) =>
      enabled
        ? 'Auto-update enabled - ToolHive will automatically update to the latest version'
        : 'Auto-update disabled',
    errorMsg: 'Failed to update auto-update setting',
  })
}
