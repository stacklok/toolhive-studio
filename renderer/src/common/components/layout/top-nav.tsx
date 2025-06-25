import type { HTMLProps } from 'react'

import { twMerge } from 'tailwind-merge'
import { CommandIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ThemeToggle } from '../theme/theme-toggle'
import { SettingsDropdown } from '../settings/settings-dropdown'
import { WindowControls } from './window-controls'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from '../ui/navigation-menu'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { isFeatureEnabled } from '@/feature-flags'

function getPlatformSpecificHeaderClasses() {
  const platformClasses = {
    darwin: 'pl-26', // Left padding for traffic light buttons
    win32: 'pr-2', // Right padding for visual spacing with window edge
    linux: '', // No padding needed - custom controls are part of the layout
  }

  return (
    platformClasses[
      window.electronAPI.platform as keyof typeof platformClasses
    ] || ''
  )
}

function TopNavContainer(props: HTMLProps<HTMLElement>) {
  return (
    <header
      {...props}
      className={twMerge(
        props.className,
        'sticky top-0 z-50',
        'bg-background/50 backdrop-blur-2xl',
        'border-mid h-16 border-b',
        'px-6',
        'grid grid-cols-[auto_1fr_auto] items-center gap-8',
        'app-region-drag',
        'w-full min-w-full',
        getPlatformSpecificHeaderClasses()
      )}
    >
      {props.children}
    </header>
  )
}

function TopNavLogo() {
  return (
    <div className="flex items-center gap-2">
      <CommandIcon className="size-6" />
      <span className="text-xl font-semibold">ToolHive</span>
    </div>
  )
}

function TopNavLinks() {
  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-1">
        <NavigationMenuItem>
          <NavigationMenuLink
            className="app-region-no-drag text-muted-foreground hover:text-foreground
              focus:text-foreground data-[status=active]:text-foreground
              data-[status=active]:before:bg-foreground focus-visible:ring-ring/50 relative
              px-4 py-2 text-sm transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px] focus-visible:outline-1
              data-[status=active]:bg-transparent data-[status=active]:before:absolute
              data-[status=active]:before:right-4 data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-4 data-[status=active]:before:h-0.5
              data-[status=active]:before:rounded-t-[1px]
              data-[status=active]:before:opacity-90 data-[status=active]:before:content-['']
              data-[status=active]:hover:bg-transparent
              data-[status=active]:focus:bg-transparent data-[status=hover]:bg-transparent"
            asChild
          >
            <Link to="/">Installed</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className="app-region-no-drag text-muted-foreground hover:text-foreground
              focus:text-foreground data-[status=active]:text-foreground
              data-[status=active]:before:bg-foreground focus-visible:ring-ring/50 relative
              px-4 py-2 text-sm transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px] focus-visible:outline-1
              data-[status=active]:bg-transparent data-[status=active]:before:absolute
              data-[status=active]:before:right-4 data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-4 data-[status=active]:before:h-0.5
              data-[status=active]:before:rounded-t-[1px]
              data-[status=active]:before:opacity-90 data-[status=active]:before:content-['']
              data-[status=active]:hover:bg-transparent
              data-[status=active]:focus:bg-transparent data-[status=hover]:bg-transparent"
            asChild
          >
            <Link to="/registry">Registry</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className="app-region-no-drag text-muted-foreground hover:text-foreground
              focus:text-foreground data-[status=active]:text-foreground
              data-[status=active]:before:bg-foreground focus-visible:ring-ring/50 relative
              px-4 py-2 text-sm transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px] focus-visible:outline-1
              data-[status=active]:bg-transparent data-[status=active]:before:absolute
              data-[status=active]:before:right-4 data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-4 data-[status=active]:before:h-0.5
              data-[status=active]:before:rounded-t-[1px]
              data-[status=active]:before:opacity-90 data-[status=active]:before:content-['']
              data-[status=active]:hover:bg-transparent
              data-[status=active]:focus:bg-transparent"
            asChild
          >
            <Link to="/clients">Clients</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className="app-region-no-drag text-muted-foreground hover:text-foreground
              focus:text-foreground data-[status=active]:text-foreground
              data-[status=active]:before:bg-foreground focus-visible:ring-ring/50 relative
              px-4 py-2 text-sm transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px] focus-visible:outline-1
              data-[status=active]:bg-transparent data-[status=active]:before:absolute
              data-[status=active]:before:right-4 data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-4 data-[status=active]:before:h-0.5
              data-[status=active]:before:rounded-t-[1px]
              data-[status=active]:before:opacity-90 data-[status=active]:before:content-['']
              data-[status=active]:hover:bg-transparent
              data-[status=active]:focus:bg-transparent"
            asChild
          >
            <Link to="/secrets">Secrets</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export function TopNav(props: HTMLProps<HTMLElement>) {
  useEffect(() => {
    // this handles notifications for update-on-restart
    // TODO: actually implement and test that this is only
    // shown after an update is downloaded
    //
    if (!isFeatureEnabled('update-on-restart')) {
      return
    }

    toast.info('Update installed!', {
      duration: Infinity,
      dismissible: true,
      id: 'update-notification',
      cancel: {
        label: 'Dismiss',
        onClick: () => toast.dismiss('update-notification'),
      },
      action: {
        label: 'Restart now',
        onClick: () => window.electronAPI.quitApp(),
      },
    })
  }, [])

  return (
    <TopNavContainer {...props}>
      <TopNavLogo />
      <TopNavLinks />
      <div className="flex items-center gap-2 justify-self-end">
        <ThemeToggle className="app-region-no-drag" />
        <SettingsDropdown className="app-region-no-drag" />
        <WindowControls />
      </div>
    </TopNavContainer>
  )
}
