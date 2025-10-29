import { useOptimizedGroupName } from '@/common/hooks/use-optimize-group-name'

export function useIsOptimizedGroupName(groupName: string) {
  const optimizedGroupName = useOptimizedGroupName()
  return groupName === optimizedGroupName
}
