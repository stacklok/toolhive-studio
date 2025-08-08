import type { CoreWorkload } from '@api/types.gen'
import { Switch } from '@/common/components/ui/switch'

function getStatusText(status: CoreWorkload['status']) {
  // There is an issue with openAPI generator in BE - https://github.com/stacklok/toolhive/issues/780
  // I am using the enum defined directly here https://github.com/stacklok/toolhive/blob/main/pkg/workloads/models.go#L15
  if (status === 'running') return 'Running'
  if (status === 'starting') return 'Starting'
  if (status === 'stopped') return 'Stopped'
  if (status === 'error') return 'Error'
  // add it for UI purposes, the BE cannot handle it for mvp
  if (status === 'stopping') return 'Stopping'
  if (status === 'deleting') return 'Deleting'
  if (status === 'restarting') return 'Restarting'
  return 'Unknown'
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
      <span className="text-muted-foreground text-sm capitalize">
        {getStatusText(status)}
      </span>
    </div>
  )
}
