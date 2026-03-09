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
        `rounded-full text-white/90 hover:bg-white/10 hover:text-white
        dark:hover:bg-white/10`,
        isActive && 'bg-nav-button-active-bg text-nav-button-active-text',
        className
      )}
      {...props}
    />
  )
}
