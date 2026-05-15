import { Button } from '@/common/components/ui/button'
import { cn } from '@/common/lib/utils'
import type { ComponentPropsWithoutRef } from 'react'

interface NavIconButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  isActive?: boolean
}

export function NavIconButton({
  isActive,
  className,
  ...props
}: NavIconButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        `text-nav-foreground/90 hover:bg-nav-foreground/10
        hover:text-nav-foreground dark:hover:bg-nav-foreground/10 rounded-full`,
        isActive && 'bg-nav-button-active-bg text-nav-button-active-text',
        className
      )}
      {...props}
    />
  )
}
