import { useOptimizedGroupName } from '@/common/hooks/use-optimize-group-name'
import { toast } from 'sonner'

export function useNotificationOptimizer() {
  const optimizedGroupName = useOptimizedGroupName()

  const notifyChangeWithOptimizer = (
    groupName: string,
    quietly: boolean = false
  ) => {
    if (quietly) return

    if (optimizedGroupName === groupName) {
      toast.success(
        'MCP Optimizer may take up to a minute to reflect changes.',
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
