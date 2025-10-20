import { useQuery } from '@tanstack/react-query'
import type { FeatureFlagKey } from '../lib/feature-flags'
import log from 'electron-log/renderer'

export function useFeatureFlag(flagKey: FeatureFlagKey): boolean {
  const { data } = useQuery({
    queryKey: ['featureFlag', flagKey],
    queryFn: async () => {
      try {
        return await window.electronAPI.featureFlags.get(flagKey)
      } catch (error) {
        log.error(`Failed to get feature flag ${flagKey}:`, error)
        return false
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  return data ?? false
}
