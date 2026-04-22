import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import { InfoIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function TooltipInfoIcon({
  children,
  className,
  ariaLabel = 'More info',
}: {
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={ariaLabel}
        data-testid="tooltip-info-icon"
        className="focus-visible:ring-ring inline-flex items-center
          justify-center rounded-full outline-none focus-visible:ring-2
          focus-visible:ring-offset-1"
      >
        <InfoIcon className="text-muted-foreground size-4 rounded-full" />
      </TooltipTrigger>
      <TooltipContent className={className}>{children}</TooltipContent>
    </Tooltip>
  )
}
