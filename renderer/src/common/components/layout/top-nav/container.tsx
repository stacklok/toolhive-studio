import type { HTMLProps } from 'react'
import { twMerge } from 'tailwind-merge'

function getPlatformSpecificHeaderClasses() {
  const platformClasses = {
    darwin: 'pl-26 pt-0.5', // Left padding for traffic light buttons + top offset for title bar
    win32: '', // Window controls are flush to the right edge
    linux: '', // No padding needed - custom controls are part of the layout
  }

  return (
    platformClasses[
      window.electronAPI.platform as keyof typeof platformClasses
    ] || ''
  )
}

export function TopNavContainer(props: HTMLProps<HTMLElement>) {
  return (
    <header
      {...props}
      className={twMerge(
        props.className,
        'bg-nav-background',
        'border-nav-border h-16 border-b',
        'pl-6',
        'grid grid-cols-[auto_1fr_auto] items-center gap-7',
        'app-region-drag',
        'w-full min-w-full',
        getPlatformSpecificHeaderClasses()
      )}
    >
      {props.children}
    </header>
  )
}
