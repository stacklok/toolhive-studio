import { cn } from '@/common/lib/utils'
import { StarIcon } from 'lucide-react'

export function Stars({
  stars,
  className,
}: {
  stars: number | undefined
  className?: string
}) {
  if (!stars) return null

  return (
    <span className="text-muted-foreground flex items-center gap-1">
      <StarIcon className={cn('size-3', className)} />
      <span className="text-sm select-none">
        {Intl.NumberFormat().format(stars)}
      </span>
    </span>
  )
}
