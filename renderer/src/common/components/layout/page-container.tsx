import { cn } from '@/common/lib/utils'
import type { ReactNode } from 'react'

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}
