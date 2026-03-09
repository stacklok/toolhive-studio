import type { HTMLProps } from 'react'
import { twMerge } from 'tailwind-merge'
import { getOsDesignVariant } from '@/common/lib/os-design'

function getPlatformSpecificHeaderClasses() {
  // Left padding for macOS traffic-light buttons + top offset for title bar
  return getOsDesignVariant() === 'mac' ? 'pl-26 pt-0.5' : ''
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
