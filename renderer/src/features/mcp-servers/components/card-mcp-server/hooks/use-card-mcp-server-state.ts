import type { CoreWorkload } from '@common/api/generated/types.gen'
import { useIsServerFromRegistry } from '../../../hooks/use-is-server-from-registry'
import { useComplianceCheck } from '../../../hooks/use-compliance-check'
import { useCardAnimations } from './use-card-animations'

export function useCardMcpServerState(
  name: string,
  status: CoreWorkload['status']
) {
  const { isNewServer, hadRecentStatusChange } = useCardAnimations(
    name,
    status
  )

  const isDeleting = status === 'removing'
  const isTransitioning = status === 'starting' || status === 'stopping'
  const isStopped = status === 'stopped' || status === 'stopping'

  const { isFromRegistry, drift, matchedRegistryItem } =
    useIsServerFromRegistry(name)
  const hasUpdate = isFromRegistry && drift

  const { report, isChecking, error, recheck } = useComplianceCheck(
    name,
    status
  )

  return {
    isNewServer,
    hadRecentStatusChange,
    isDeleting,
    isTransitioning,
    isStopped,
    isFromRegistry: !!isFromRegistry,
    drift,
    hasUpdate,
    matchedRegistryItem,
    report,
    isChecking,
    error,
    recheck,
  }
}
