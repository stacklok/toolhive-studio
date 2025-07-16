import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip'

export function TooltipValueRequired() {
  return (
    <Tooltip>
      <TooltipTrigger asChild autoFocus={false}>
        <span
          aria-label="required"
          className="text-destructive ml-0.5 cursor-help align-super font-sans text-sm"
        >
          *
        </span>
      </TooltipTrigger>
      <TooltipContent>Required</TooltipContent>
    </Tooltip>
  )
}
