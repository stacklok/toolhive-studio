import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { WrapperField } from './wrapper-field'
import { Switch } from '@/common/components/ui/switch'
import { featureFlagKeys } from '../../../../../../../utils/feature-flags'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { initMetaOptimizer } from '@/common/lib/meta-optimizer'
import { useCleanupMetaOptimizer } from '@/common/hooks/use-cleanup-meta-optimizer'

function formatFeatureFlagName(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function formatFeatureFlagDescription(key: string): string {
  return `Enable ${formatFeatureFlagName(key)} feature`
}

export function ExperimentalFeatures() {
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
      // Invalidate ALL queries in the cache
      queryClient.invalidateQueries()
    },
  })

  const { mutateAsync: disableFlag, isPending: isDisabling } = useMutation({
    mutationFn: (key: string) => window.electronAPI.featureFlags.disable(key),
    onSuccess: () => {
      // Invalidate ALL queries in the cache
      queryClient.invalidateQueries()
    },
  })

  const flags = Object.entries(allFlags ?? {})
    .filter(([, options]) => options.isExperimental && !options.isDisabled)
    .map(([key, options]) => ({ ...options, key }))

  const handleToggle = async (flagKey: string, currentValue: boolean) => {
    try {
      if (currentValue) {
        await disableFlag(flagKey)
        cleanupMetaOptimizer()
      } else {
        await enableFlag(flagKey)
        initMetaOptimizer()
      }
    } catch (error) {
      log.error(`Failed to toggle feature flag ${flagKey}:`, error)
    }
  }

  if (isLoadingFlags) {
    return (
      <div>
        <h2 className="text-lg font-semibold">Experimental Features</h2>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  if (!isExperimentalFeaturesEnabled) {
    return (
      <div>
        <h2 className="text-lg font-semibold">Experimental Features</h2>
        <p className="text-muted-foreground text-sm">
          No experimental features available
        </p>
      </div>
    )
  }

  const isPending = isEnabling || isDisabling

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Experimental Features</h2>

      {flags.map(({ key, enabled }) => {
        const flagId = `feature-flag-${key}`

        return (
          <WrapperField
            key={key}
            label={formatFeatureFlagName(key)}
            description={formatFeatureFlagDescription(key)}
            htmlFor={flagId}
          >
            <Switch
              id={flagId}
              checked={enabled}
              onCheckedChange={() => handleToggle(key, enabled)}
              disabled={isPending}
            />
          </WrapperField>
        )
      })}
    </div>
  )
}
