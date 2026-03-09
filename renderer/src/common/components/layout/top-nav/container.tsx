import type { HTMLProps } from 'react'
import { twMerge } from 'tailwind-merge'
import { getOsDesignVariant } from '@/common/lib/os-design'

function getPlatformSpecificHeaderClasses() {
  if (getOsDesignVariant() === 'mac') {
    // Left padding to clear the macOS traffic-light buttons
    return 'pl-26'
  }

  // Windows needs a small right padding for visual spacing against the window
  // edge. This is the only known design difference between Windows and Linux —
  // both share the same 'windows' OS design variant for everything else.
  if (window.electronAPI.platform === 'win32') {
    return 'pr-2'
  }

  return ''
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
