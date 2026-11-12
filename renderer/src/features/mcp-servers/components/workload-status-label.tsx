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

  const warningLabel = (
    <span className={cn('text-warning text-sm', className)}>{label}</span>
  )

  if (!statusContext) return warningLabel

  return (
    <Tooltip>
      <TooltipTrigger asChild>{warningLabel}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{statusContext}</TooltipContent>
    </Tooltip>
  )
}
