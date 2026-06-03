import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToastMutation } from './use-toast-mutation'
import { APP_DISPLAY_NAME } from '@common/app-info'

export function useAutoLaunchStatus() {
  return useQuery({
    queryKey: ['auto-launch-status'],
    queryFn: window.electronAPI.getAutoLaunchStatus,
  })
}

export function useSetAutoLaunch() {
  const queryClient = useQueryClient()

  return useToastMutation({
    mutationFn: (enabled: boolean) => window.electronAPI.setAutoLaunch(enabled),
    onSuccess: () => {
      // Invalidate and refetch the auto-launch status
      queryClient.invalidateQueries({ queryKey: ['auto-launch-status'] })
    },
    successMsg: (enabled) =>
      enabled
        ? `Auto-launch enabled - ${APP_DISPLAY_NAME} will start when you log into your system`
        : 'Auto-launch disabled',
    errorMsg: 'Failed to update auto-launch setting',
  })
}
