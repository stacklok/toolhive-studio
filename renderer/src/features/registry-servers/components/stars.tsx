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
    <>
      <StarIcon className={cn('text-muted-foreground size-3', className)} />
      <span className="text-muted-foreground text-sm select-none">
        {Intl.NumberFormat().format(stars)}
      </span>
    </>
  )
}
