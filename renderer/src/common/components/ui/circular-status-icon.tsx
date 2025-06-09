import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const circularStatusIconVariants = cva(
  'size-4 rounded-full border-4 transition-[color,border]',
  {
    variants: {
      variant: {
        default: 'border-gray-100 bg-gray-500',
        destructive: 'border-red-100 bg-red-500',
        success: 'border-green-100 bg-green-500',
        warning: 'border-yellow-100 bg-yellow-500',
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
