import { useQuery } from '@tanstack/react-query'
import type { FeatureFlagKey } from '../lib/feature-flags'

export function useFeatureFlag(flagKey: FeatureFlagKey): boolean {
  const { data } = useQuery({
    queryKey: ['featureFlag', flagKey],
    queryFn: async () => {
      const api = (globalThis as unknown as { electronAPI?: any }).electronAPI
      const getter = api?.featureFlags?.get
      if (!getter) return false
      try {
        return await getter(flagKey)
      } catch {
        return false
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  return data ?? false
}
