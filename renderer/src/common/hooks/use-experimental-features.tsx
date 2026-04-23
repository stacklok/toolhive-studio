import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { useCallback } from 'react'
import { featureFlagKeys } from '../../../../utils/feature-flags'
import { trackEvent } from '../lib/analytics'

interface FeatureFlag {
  key: string
  enabled: boolean
  isExperimental: boolean
  isDisabled: boolean
}

function formatFeatureFlagName(key: string): string {
  if (key === featureFlagKeys.SKILLS) {
    return 'Skills'
  }

  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function formatFeatureFlagDescription(key: string): React.ReactNode {
  if (key === featureFlagKeys.SKILLS) {
    return 'Browse and manage AI agent skills installed via ToolHive.'
  }

  return `Enable ${formatFeatureFlagName(key)} feature`
}

export function useExperimentalFeatures() {
  const queryClient = useQueryClient()

  const { data: allFlags, isPending: isLoadingFlags } = useQuery({
    queryKey: ['featureFlags', 'all'],
    queryFn: window.electronAPI.featureFlags.getAll,
    staleTime: 0,
    gcTime: 0,
  })

  const { mutateAsync: enableFlag, isPending: isEnabling } = useMutation({
    mutationFn: (key: string) => window.electronAPI.featureFlags.enable(key),
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  const { mutateAsync: disableFlag, isPending: isDisabling } = useMutation({
    mutationFn: (key: string) => window.electronAPI.featureFlags.disable(key),
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  const flags = Object.entries(allFlags ?? {})
    .filter(([, options]) => options.isExperimental && !options.isDisabled)
    .map(([key, options]) => ({ ...options, key })) as FeatureFlag[]

  const handleToggle = useCallback(
    async (flagKey: string, currentValue: boolean) => {
      try {
        if (currentValue) {
          await disableFlag(flagKey)
          trackEvent('Feature flag disabled', {
            flag_key: flagKey,
          })
        } else {
          await enableFlag(flagKey)
          trackEvent('Feature flag enabled', {
            flag_key: flagKey,
          })
        }
      } catch (error) {
        log.error(`Failed to toggle feature flag ${flagKey}:`, error)
      }
    },
    [disableFlag, enableFlag]
  )

  const isPending = isEnabling || isDisabling

  return {
    flags,
    isLoadingFlags,
    isPending,
    handleToggle,
    formatFeatureFlagName,
    formatFeatureFlagDescription,
  }
}
