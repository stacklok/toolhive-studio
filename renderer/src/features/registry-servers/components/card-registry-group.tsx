import type { RegistryGroup } from '@api/types.gen'
import { GitFork } from 'lucide-react'
import { Badge } from '@/common/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { CardRegistryWrapper } from './card-registry-wrapper'

export function CardRegistryGroup({
  group,
  onClick,
}: {
  group: RegistryGroup
  onClick?: () => void
}) {
  const serverCount =
    (group.servers ? Object.keys(group.servers).length : 0) +
    (group.remote_servers ? Object.keys(group.remote_servers).length : 0)

  const badge = (
    <Badge
      variant="secondary"
      className="bg-foreground/5 w-fit rounded-full px-2.5 py-0.5"
    >
      Group
    </Badge>
  )

  const footer = (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative z-10 flex items-center gap-2">
          <GitFork className="text-muted-foreground size-5" />
          <span className="text-muted-foreground text-sm">
            {serverCount} {serverCount === 1 ? 'server' : 'servers'}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        This group contains {serverCount} MCP{' '}
        {serverCount === 1 ? 'server' : 'servers'}
      </TooltipContent>
    </Tooltip>
  )

  return (
    <CardRegistryWrapper
      title={group.name!}
      description={group.description}
      badge={badge}
      footer={footer}
      onClick={onClick}
    />
  )
}
