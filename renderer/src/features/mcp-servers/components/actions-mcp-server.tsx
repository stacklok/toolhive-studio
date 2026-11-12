import type { CoreWorkload } from '@common/api/generated/types.gen'
import { Switch } from '@/common/components/ui/switch'
import { WorkloadStatusLabel } from './workload-status-label'

export function ActionsMcpServer({
  status,
  statusContext,
  isPending,
  mutate,
}: {
  status: CoreWorkload['status']
  statusContext?: CoreWorkload['status_context']
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
      <WorkloadStatusLabel status={status} statusContext={statusContext} />
    </div>
  )
}
