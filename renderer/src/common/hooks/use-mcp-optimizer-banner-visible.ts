import { useMatches } from '@tanstack/react-router'
import { useFeatureFlag } from './use-feature-flag'
import { featureFlagKeys } from '../../../../utils/feature-flags'
import { MCP_OPTIMIZER_BANNER_ROUTES } from '../lib/constants'

export function useMcpOptimizerBannerVisible() {
  const matches = useMatches()
  const isMetaOptimizerEnabled = useFeatureFlag(featureFlagKeys.META_OPTIMIZER)
  const isOnServerPage = matches.some((m) =>
    MCP_OPTIMIZER_BANNER_ROUTES.includes(m.routeId)
  )
  return isMetaOptimizerEnabled && isOnServerPage
}
