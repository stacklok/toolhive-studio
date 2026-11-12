import type { CoreWorkload } from '@common/api/generated/types.gen'
import { Switch } from '@/common/components/ui/switch'
import { cn } from '@/common/lib/utils'

function getStatusText(status: CoreWorkload['status'] | 'restarting') {
  // 'removing' maps to 'Deleting' for UI purposes
  if (status === 'removing') return 'Deleting'
  // 'restarting' is a UI-only status, not part of the backend union type
  if (status === 'restarting') return 'Restarting'
  if (status === 'unauthenticated') return 'Authentication required'
  if (status === 'auth_retrying') return 'Retrying authentication'
  return status
}

export function ActionsMcpServer({
  status,
  isPending,
  mutate,
}: {
  status: CoreWorkload['status']
  isPending: boolean
  mutate: () => void
}) {
  const isStarting = status === 'starting'
  const isRunning = status === 'running'
  const isAuthIssue =
    status === 'unauthenticated' || status === 'auth_retrying'

  return (
    <div className="flex items-center gap-2">
      <div onClick={(e) => e.preventDefault()}>
        <Switch
          aria-label="Mutate server"
          checked={isRunning || isStarting}
          disabled={isStarting || isPending}
          onCheckedChange={() => mutate()}
        />
      </div>
      <span
        className={cn(
          'text-sm',
          isAuthIssue
            ? 'text-amber-500'
            : 'text-muted-foreground capitalize'
        )}
      >
        {getStatusText(status)}
      </span>
    </div>
  )
}
