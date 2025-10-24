import { useOptimizedGroupName } from '@/common/hooks/use-optimize-group-name'
import { toast } from 'sonner'

export function useNotificationOptimizer() {
  const optimizedGroupName = useOptimizedGroupName()

  const notifyChangeWithOptimizer = (groupName: string) => {
    if (optimizedGroupName === groupName) {
      toast.success(
        'The optimizer could take a moment to update with this change',
        {
          duration: 10_000,
          closeButton: true,
          id: 'optimizer-after-change-message',
        }
      )
    }
  }
  return notifyChangeWithOptimizer
}
