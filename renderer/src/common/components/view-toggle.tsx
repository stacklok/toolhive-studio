import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/common/lib/utils'
import type { ViewMode } from '../../../../main/src/ui-preferences'

interface ViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
  ariaLabel?: string
}

const ITEM_STYLES = `focus-visible:ring-ring/50 text-foreground
  dark:text-muted-foreground inline-flex size-7 cursor-pointer items-center
  justify-center rounded-full transition-colors focus-visible:ring-[3px]
  focus-visible:outline-none
  data-[state=checked]:bg-background data-[state=checked]:shadow-sm
  data-[state=checked]:dark:bg-card data-[state=checked]:dark:text-foreground`

export function ViewToggle({
  value,
  onChange,
  className,
  ariaLabel = 'View mode',
}: ViewToggleProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(next) => {
        if (next && next !== value) onChange(next as ViewMode)
      }}
      aria-label={ariaLabel}
      className={cn(
        `inline-flex h-auto items-center gap-1 rounded-full bg-zinc-200 p-1
        dark:bg-zinc-800`,
        className
      )}
    >
      <RadioGroupPrimitive.Item
        value="card"
        aria-label="Card view"
        className={cn(ITEM_STYLES)}
      >
        <LayoutGrid className="size-4" aria-hidden />
      </RadioGroupPrimitive.Item>
      <RadioGroupPrimitive.Item
        value="table"
        aria-label="Table view"
        className={cn(ITEM_STYLES)}
      >
        <List className="size-4" aria-hidden />
      </RadioGroupPrimitive.Item>
    </RadioGroupPrimitive.Root>
  )
}
