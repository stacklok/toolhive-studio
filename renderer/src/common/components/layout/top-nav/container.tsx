import type { HTMLProps } from 'react'
import { twMerge } from 'tailwind-merge'
import { getOsDesignVariant } from '@/common/lib/os-design'

function getPlatformSpecificHeaderClasses() {
  // Left padding to clear the macOS traffic-light buttons
  return getOsDesignVariant() === 'mac' ? 'pl-26' : ''
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
        'grid grid-cols-[auto_3fr_auto] items-center',
        'app-region-drag',
        'w-full min-w-full',
        getPlatformSpecificHeaderClasses()
      )}
    >
      {props.children}
    </header>
  )
}
