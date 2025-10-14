import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/common/components/ui/card'
import { Plus } from 'lucide-react'
import { cn } from '@/common/lib/utils'
import type { ReactNode } from 'react'

export function CardRegistryWrapper({
  title,
  description,
  badge,
  footer,
  onClick,
}: {
  title: string
  description?: string
  badge?: ReactNode
  footer?: ReactNode
  onClick?: () => void
}) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer',
        'transition-[box-shadow,color]',
        'group',
        'hover:ring',
        'has-[button:focus-visible]:ring'
      )}
    >
      <CardHeader>
        <CardTitle
          className="grid grid-cols-[auto_calc(var(--spacing)_*_5)] items-center
            text-xl"
        >
          <button
            className="truncate text-left !outline-none select-none"
            onClick={() => onClick?.()}
          >
            {title}
            <span className="absolute inset-0 rounded-md" />
          </button>
          <Plus
            className="text-muted-foreground
              group-has-[button:focus-visible]:text-foreground
              group-hover:text-foreground transition-color size-5"
          />
        </CardTitle>
        {badge}
      </CardHeader>

      <CardContent>
        <div className="text-muted-foreground text-sm select-none">
          {description}
        </div>
      </CardContent>
      {footer && (
        <CardFooter className="mt-auto flex items-center gap-2">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
