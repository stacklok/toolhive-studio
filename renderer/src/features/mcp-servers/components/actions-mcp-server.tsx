import type { WorkloadsWorkload } from '@/common/api/generated/types.gen'
import { Switch } from '@/common/components/ui/switch'
import { cn } from '@/common/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/common/components/ui/dropdown-menu'
import { Button } from '@/common/components/ui/button'
import { MoreVertical, Trash2, List } from 'lucide-react'

function getStatusText(status: WorkloadsWorkload['status']) {
  // We will have enum in the next API refactor
  if (status === 'running') return 'Running'
  if (status === 'restarting') return 'Restarting'
  if (status === 'starting') return 'Starting'
  if (status === 'stopped') return 'Stopped'
  if (status === 'stopping') return 'Stopping'
  return 'Unknown'
}

export function ActionsMcpServer({
  status,
  isPending,
  mutate,
}: {
  status: WorkloadsWorkload['status']
  isPending: boolean
  mutate: () => void
}) {
  const isRestarting = status === 'restarting'
  const isRunning = status === 'running'

  return (
    <div className="flex items-center gap-2">
      <div onClick={(e) => e.preventDefault()}>
        <Switch
          aria-label="Mutate server"
          className={cn(
            'cursor-pointer',
            isRunning &&
              'dark:data-[state=checked]:bg-primary data-[state=checked]:bg-green-600'
          )}
          checked={isRunning || isPending}
          disabled={isRestarting}
          onCheckedChange={() => mutate()}
        />
      </div>
      <span className="text-muted-foreground text-sm capitalize">
        {getStatusText(status)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="More options"
            className="ml-2"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <List className="mr-2 h-4 w-4" />
            Logs
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
