import { TooltipTrigger } from '@radix-ui/react-tooltip'
import { Tooltip, TooltipContent } from './tooltip'
import { InfoIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function TooltipInfoIcon({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild autoFocus={false}>
        <InfoIcon className="text-muted-foreground size-4 rounded-full" />
      </TooltipTrigger>
      <TooltipContent className={className}>{children}</TooltipContent>
    </Tooltip>
  )
}
