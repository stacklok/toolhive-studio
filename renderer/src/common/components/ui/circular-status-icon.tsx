import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const circularStatusIconVariants = cva(
  'size-4 rounded-full border-4 transition-[color,border]',
  {
    variants: {
      variant: {
        default: 'border-muted bg-muted-foreground',
        destructive: 'border-destructive/20 bg-destructive',
        success: 'border-success/20 bg-success',
        warning: 'border-warning/20 bg-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export function CircularStatusIcon({
  className,
  variant,
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> &
  VariantProps<typeof circularStatusIconVariants>) {
  return (
    <div
      data-slot="status-icon"
      className={cn(circularStatusIconVariants({ variant }), className)}
      {...props}
    />
  )
}
