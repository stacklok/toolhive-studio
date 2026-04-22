import { useQuery } from '@tanstack/react-query'

const THREE_DAYS_MS = 1000 * 60 * 60 * 24 * 3

export function useInstanceId() {
  const { data: instanceId, isFetched } = useQuery({
    queryKey: ['instance-id'],
    queryFn: () => window.electronAPI.getInstanceId(),
    staleTime: THREE_DAYS_MS,
  })

  return { instanceId, isFetched }
}
