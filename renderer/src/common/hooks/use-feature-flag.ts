import { useQuery } from '@tanstack/react-query'
import type { FeatureFlagKey } from '../lib/feature-flags'

export function useFeatureFlag(flagKey: FeatureFlagKey): boolean {
  const { data } = useQuery({
    queryKey: ['featureFlag', flagKey],
    queryFn: async () => {
      return await window.electronAPI.featureFlags.get(flagKey)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  return data ?? false
}
