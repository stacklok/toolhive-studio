import type { CoreWorkload } from '@common/api/generated/types.gen'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { cn } from '@/common/lib/utils'
import {
  getWorkloadStatusLabel,
  isWarningWorkloadStatus,
} from '../lib/workload-status'

export function WorkloadStatusLabel({
  status,
  statusContext,
  className,
}: {
  status: CoreWorkload['status']
  statusContext?: CoreWorkload['status_context']
  className?: string
}) {
  const label = getWorkloadStatusLabel(status)

  if (!isWarningWorkloadStatus(status)) {
    return (
      <span
        className={cn('text-muted-foreground text-sm capitalize', className)}
      >
        {label}
      </span>
    )
  }

  const warningClassName = cn('text-warning text-sm', className)

  if (!statusContext) {
    return <span className={warningClassName}>{label}</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Focusable so keyboard users can open the tooltip and read the reason */}
        <span tabIndex={0} className={warningClassName}>
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{statusContext}</TooltipContent>
    </Tooltip>
  )
}
