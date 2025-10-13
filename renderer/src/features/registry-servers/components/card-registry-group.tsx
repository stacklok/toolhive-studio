import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/common/components/ui/card'
import type { RegistryGroup } from '@api/types.gen'
import { GitFork, Plus } from 'lucide-react'
import { cn } from '@/common/lib/utils'
import { Badge } from '@/common/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'

export function CardRegistryGroup({
  group,
  onClick,
}: {
  group: RegistryGroup
  onClick?: () => void
}) {
  // Count total servers in the group
  const serverCount =
    (group.servers ? Object.keys(group.servers).length : 0) +
    (group.remote_servers ? Object.keys(group.remote_servers).length : 0)

  return (
    <Card
      className={cn(
        'relative cursor-pointer',
        'transition-[box-shadow,color]',
        'group',
        'hover:ring',
        'has-[button:focus-visible]:ring'
      )}
    >
      <CardHeader>
        <CardTitle
          className="grid grid-cols-[auto_calc(var(--spacing)_*_5)] items-center
            text-xl"
        >
          <button
            className="truncate text-left !outline-none select-none"
            onClick={() => onClick?.()}
          >
            {group.name}
            {/** make the entire area of the card clickable */}
            <span className="absolute inset-0 rounded-md" />{' '}
          </button>
          <Plus
            className="text-muted-foreground
              group-has-[button:focus-visible]:text-foreground
              group-hover:text-foreground transition-color size-5"
          />
        </CardTitle>
        <Badge
          variant="secondary"
          className="bg-foreground/5 w-fit rounded-full px-2.5 py-0.5"
        >
          Group
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="text-muted-foreground text-sm select-none">
          {group.description}
        </div>
      </CardContent>
      <CardFooter className="mt-auto flex items-center gap-2">
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
      </CardFooter>
    </Card>
  )
}
