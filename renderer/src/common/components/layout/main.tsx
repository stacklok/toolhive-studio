import type { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export function Main(props: { children: ReactNode; className?: string }) {
  return <main {...props} className={twMerge('relative', props.className)} />
}
