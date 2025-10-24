import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import log from 'electron-log/renderer'
import { toast } from 'sonner'
import { useCallback, useRef } from 'react'
import { featureFlagKeys } from '../../../../utils/feature-flags'
import { useFeatureFlag } from './use-feature-flag'
import { useCleanupMetaOptimizer } from './use-cleanup-meta-optimizer'
import { useCreateOptimizerGroup } from './use-create-optimizer-group'
import { Button } from '../components/ui/button'
import { Link } from '@tanstack/react-router'
import {
  MCP_OPTIMIZER_GROUP_NAME,
  META_MCP_SERVER_NAME,
} from '../lib/constants'
import { getApiV1BetaWorkloadsByNameQueryKey } from '@api/@tanstack/react-query.gen'

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
  const toastIdRef = useRef(new Date(Date.now()).toISOString())
  const { handleCreateOptimizerGroup, isCreatingOptimizerGroup } =
    useCreateOptimizerGroup()
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
      // Remove cached data when disabling flags
      queryClient.removeQueries({
        queryKey: getApiV1BetaWorkloadsByNameQueryKey({
          path: { name: META_MCP_SERVER_NAME },
        }),
      })
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

          {
            toast.success(`MCP Optimizer is enabled`, {
              id: toastIdRef.current,
              duration: 10_000,
              closeButton: true,
              action: (
                <Button asChild size="xs" className="ml-auto text-xs">
                  <Link
                    to="/mcp-optimizer"
                    params={{ groupName: MCP_OPTIMIZER_GROUP_NAME }}
                    onClick={() => toast.dismiss(toastIdRef.current)}
                    viewTransition={{ types: ['slide-left'] }}
                  >
                    Configure
                  </Link>
                </Button>
              ),
            })
          }
        }
      } catch (error) {
        log.error(`Failed to toggle feature flag ${flagKey}:`, error)
      }
    },
    [cleanupMetaOptimizer, disableFlag, handleCreateOptimizerGroup, enableFlag]
  )

  const isPending = isEnabling || isDisabling || isCreatingOptimizerGroup

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
