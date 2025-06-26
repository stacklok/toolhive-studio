import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/common/lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        `peer data-[state=unchecked]:bg-input focus-visible:border-ring
        focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex
        h-[1.15rem] w-8 shrink-0 cursor-pointer items-center rounded-full border
        border-transparent shadow-xs transition-all outline-none
        focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50
        data-[state=checked]:bg-green-600`,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          `bg-background dark:data-[state=unchecked]:bg-foreground
          dark:data-[state=checked]:bg-foreground pointer-events-none block
          size-[calc(calc(var(--spacing)_*_4_-_1px))] rounded-full ring-0
          transition-transform data-[state=checked]:translate-x-[calc(100%-0.5px)]
          data-[state=unchecked]:translate-x-[0.5px]`
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
