import { useQuery } from '@tanstack/react-query'
import type { FeatureFlagKey } from '../lib/feature-flags'

export function useFeatureFlag(flagKey: FeatureFlagKey): boolean {
  const { data } = useQuery({
    queryKey: ['featureFlag', flagKey],
    queryFn: async () => {
      try {
        // In non-Electron/test environments, this may throw – fall back to false
        return await window.electronAPI.featureFlags.get(flagKey)
      } catch {
        return false
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  return data ?? false
}
