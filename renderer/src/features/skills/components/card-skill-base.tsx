import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/common/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { cn } from '@/common/lib/utils'
import type { ReactNode } from 'react'

interface CardSkillBaseProps {
  title: string
  subtitle?: string
  description?: string
  badges?: ReactNode
  footer?: ReactNode
  onClick?: () => void
}

export function CardSkillBase({
  title,
  subtitle,
  description,
  badges,
  footer,
  onClick,
}: CardSkillBaseProps) {
  const isClickable = !!onClick

  return (
    <Card
      className={cn(
        'relative flex flex-col',
        'transition-[box-shadow,color]',
        'group',
        isClickable && 'cursor-pointer',
        'hover:ring',
        'has-[button:focus-visible]:ring'
      )}
    >
      <CardHeader>
        <CardTitle
          className="grid grid-cols-[auto_calc(var(--spacing)*5)] items-center
            text-xl"
        >
          <Tooltip onlyWhenTruncated>
            <TooltipTrigger asChild>
              {isClickable ? (
                <button
                  type="button"
                  className="truncate text-left outline-none! select-none"
                  onClick={() => onClick?.()}
                >
                  {title}
                  <span className="absolute inset-0 rounded-md" />
                </button>
              ) : (
                <span className="truncate select-none">{title}</span>
              )}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{title}</TooltipContent>
          </Tooltip>
        </CardTitle>
        {subtitle && (
          <p className="text-muted-foreground truncate text-sm select-none">
            {subtitle}
          </p>
        )}
        {badges}
      </CardHeader>

      <CardContent className="flex-1">
        {description && (
          <Tooltip onlyWhenTruncated>
            <TooltipTrigger asChild>
              <p
                className="text-muted-foreground line-clamp-3 text-sm
                  select-none"
              >
                {description}
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{description}</TooltipContent>
          </Tooltip>
        )}
      </CardContent>

      {footer && (
        <CardFooter className="mt-auto flex items-center gap-2">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
