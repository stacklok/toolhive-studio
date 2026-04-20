import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/common/lib/utils'
import type { ViewMode } from '../../../../main/src/ui-preferences'

interface ViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
  ariaLabel?: string
}

export function ViewToggle({
  value,
  onChange,
  className,
  ariaLabel = 'View mode',
}: ViewToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        `inline-flex h-auto items-center gap-1 rounded-full bg-zinc-200 p-1
        dark:bg-zinc-800`,
        className
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === 'card'}
        aria-label="Card view"
        data-state={value === 'card' ? 'active' : 'inactive'}
        onClick={() => onChange('card')}
        className={cn(
          `focus-visible:ring-ring/50 text-foreground dark:text-muted-foreground
          inline-flex size-7 cursor-pointer items-center justify-center
          rounded-full transition-colors focus-visible:ring-[3px]
          focus-visible:outline-none`,
          value === 'card' &&
            'bg-background dark:bg-card dark:text-foreground shadow-sm'
        )}
      >
        <LayoutGrid className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'table'}
        aria-label="Table view"
        data-state={value === 'table' ? 'active' : 'inactive'}
        onClick={() => onChange('table')}
        className={cn(
          `focus-visible:ring-ring/50 text-foreground dark:text-muted-foreground
          inline-flex size-7 cursor-pointer items-center justify-center
          rounded-full transition-colors focus-visible:ring-[3px]
          focus-visible:outline-none`,
          value === 'table' &&
            'bg-background dark:bg-card dark:text-foreground shadow-sm'
        )}
      >
        <List className="size-4" aria-hidden />
      </button>
    </div>
  )
}
