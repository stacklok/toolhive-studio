import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { toast } from 'sonner'
import { useCallback } from 'react'
import { featureFlagKeys } from '../../../../utils/feature-flags'
import { useFeatureFlag } from './use-feature-flag'
import { useCleanupMetaOptimizer } from './use-cleanup-meta-optimizer'
import { useCreateOptimizerGroup } from './use-create-optimizer-group'

interface FeatureFlag {
  key: string
  enabled: boolean
  isExperimental: boolean
  isDisabled: boolean
}

function formatFeatureFlagName(key: string): string {
  if (key === featureFlagKeys.META_OPTIMIZER) {
    return 'MCP Optimizer'
  }

  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function formatFeatureFlagDescription(key: string): string {
  return `Enable ${formatFeatureFlagName(key)} feature`
}

export function useExperimentalFeatures() {
  const { handleCreateOptimizerGroup } = useCreateOptimizerGroup()
  const isExperimentalFeaturesEnabled = useFeatureFlag(
    featureFlagKeys.EXPERIMENTAL_FEATURES
  )
  const { cleanupMetaOptimizer } = useCleanupMetaOptimizer()
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
          await cleanupMetaOptimizer()
          await disableFlag(flagKey)
        } else {
          await handleCreateOptimizerGroup()
          await enableFlag(flagKey)
          toast.success(`${formatFeatureFlagName(flagKey)} is now enabled`)
        }
      } catch (error) {
        log.error(`Failed to toggle feature flag ${flagKey}:`, error)
      }
    },
    [cleanupMetaOptimizer, disableFlag, handleCreateOptimizerGroup, enableFlag]
  )

  const isPending = isEnabling || isDisabling

  return {
    flags,
    isLoadingFlags,
    isExperimentalFeaturesEnabled,
    isPending,
    handleToggle,
    formatFeatureFlagName,
    formatFeatureFlagDescription,
  }
}
