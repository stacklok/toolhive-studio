import { Card } from '@/common/components/ui/card'
import type { CoreWorkload } from '@common/api/generated/types.gen'
import { twMerge } from 'tailwind-merge'
import { CardHeaderMcpServer } from './card-header'
import { CardContentMcpServer } from './card-content'
import { useCardMcpServerState } from './hooks/use-card-mcp-server-state'

export function CardMcpServer({
  name,
  status,
  url,
  remote,
  transport,
  group,
}: {
  name: string
  status: CoreWorkload['status']
  statusContext?: CoreWorkload['status_context']
  remote?: CoreWorkload['remote']
  url: string
  transport: CoreWorkload['transport_type']
  group?: CoreWorkload['group']
}) {
  const {
    isNewServer,
    hadRecentStatusChange,
    isDeleting,
    isTransitioning,
    isStopped,
    isFromRegistry,
    drift,
    hasUpdate,
    matchedRegistryItem,
    report,
    isChecking,
    error,
    recheck,
  } = useCardMcpServerState(name, status)

  return (
    <Card
      className={twMerge(
        'transition-all duration-300 ease-in-out',
        isNewServer ? 'ring-2' : undefined,
        isDeleting ? 'pointer-events-none opacity-50' : undefined,
        (isTransitioning || hadRecentStatusChange) && 'animate-diagonal-ring',
        isStopped && 'bg-card/65'
      )}
    >
      <CardHeaderMcpServer
        name={name}
        url={url}
        status={status}
        remote={!!remote}
        group={group}
        isStopped={isStopped}
        isFromRegistry={isFromRegistry}
        drift={drift}
        matchedRegistryItem={matchedRegistryItem}
        onRecheck={() => recheck()}
        isCheckingCompliance={isChecking}
      />
      <CardContentMcpServer
        status={status}
        name={name}
        transport={transport}
        group={group}
        drift={hasUpdate ? drift : null}
        registryImage={
          hasUpdate && matchedRegistryItem && 'image' in matchedRegistryItem
            ? (matchedRegistryItem.image ?? null)
            : null
        }
        registryEnvVars={hasUpdate ? matchedRegistryItem?.env_vars : undefined}
        report={report}
        isChecking={isChecking}
        error={error}
      />
    </Card>
  )
}
