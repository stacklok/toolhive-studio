import type { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export function Main(props: { children: ReactNode; className?: string }) {
  return (
    <main
      {...props}
      className={twMerge(
        'flex min-h-0 w-full flex-1 flex-col',
        'h-[calc(100dvh-calc(var(--spacing)_*_16))] overflow-y-auto',
        'px-3 py-4',
        '[view-transition-name:main-content]',
        props.className
      )}
      style={{
        scrollbarGutter: 'stable both-edges',
      }}
    />
  )
}
