import type { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export function Main(props: { children: ReactNode; className?: string }) {
  return (
    <main
      {...props}
      className={twMerge(
        'flex min-h-0 w-full flex-1 flex-col px-6 py-4',
        props.className
      )}
    />
  )
}
