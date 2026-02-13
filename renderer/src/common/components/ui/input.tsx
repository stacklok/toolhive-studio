import * as React from 'react'

import { cn } from '@/common/lib/utils'

const BaseInput = ({
  className,
  type,
  ...props
}: React.ComponentProps<'input'>) => (
  <input
    type={type}
    data-slot="input"
    className={cn(
      `file:text-foreground placeholder:text-muted-foreground
      selection:bg-primary selection:text-primary-foreground border-input
      dark:bg-card flex h-9 w-full min-w-0 rounded-md border bg-white px-3 py-1
      text-base shadow-xs transition-[color,box-shadow] outline-none
      file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm
      file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed
      disabled:opacity-50 md:text-sm`,
      `focus-visible:border-ring focus-visible:ring-ring/50
      focus-visible:ring-[3px]`,
      `aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40
      aria-invalid:border-destructive`,
      className
    )}
    {...props}
  />
)

function Input({
  className,
  type,
  adornment = null,
  ...props
}: React.ComponentProps<'input'> & {
  adornment?: React.ReactNode
}) {
  const hasAdornment = adornment !== null

  if (hasAdornment) {
    return (
      <div className="relative">
        <BaseInput className={cn(className, 'pr-12')} type={type} {...props} />
        <div className="absolute top-0 right-0 border-l">{adornment}</div>
      </div>
    )
  }

  return <BaseInput className={className} type={type} {...props} />
}

export { Input }
