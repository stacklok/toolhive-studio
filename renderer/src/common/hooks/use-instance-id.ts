import { useQuery } from '@tanstack/react-query'

export function useInstanceId() {
  const { data: instanceId, isFetched } = useQuery({
    queryKey: ['instance-id'],
    queryFn: () => window.electronAPI.getInstanceId(),
  })

  return { instanceId, isFetched }
}
