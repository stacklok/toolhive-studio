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
import { Separator } from '../ui/separator'

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
        'bg-muted/50',
        'border-mid h-16 border-b',
        'px-6',
        'grid grid-cols-[auto_1fr_auto] items-center gap-7',
        'app-region-drag',
        'w-full min-w-full',
        'shadow-[0px_-12px_18px_0px_rgb(0_0_0/0.6)]',
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
      <NavigationMenuList className="gap-0">
        <NavigationMenuItem>
          <NavigationMenuLink
            className="app-region-no-drag text-muted-foreground hover:text-foreground
              focus:text-foreground data-[status=active]:text-foreground
              data-[status=active]:before:bg-foreground focus-visible:ring-ring/50 relative
              px-3 py-2 text-sm transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px] focus-visible:outline-1
              data-[status=active]:bg-transparent data-[status=active]:before:absolute
              data-[status=active]:before:right-3 data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-3 data-[status=active]:before:h-0.5
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
              px-3 py-2 text-sm transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px] focus-visible:outline-1
              data-[status=active]:bg-transparent data-[status=active]:before:absolute
              data-[status=active]:before:right-3 data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-3 data-[status=active]:before:h-0.5
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
              px-3 py-2 text-sm transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px] focus-visible:outline-1
              data-[status=active]:bg-transparent data-[status=active]:before:absolute
              data-[status=active]:before:right-3 data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-3 data-[status=active]:before:h-0.5
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
              px-3 py-2 text-sm transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px] focus-visible:outline-1
              data-[status=active]:bg-transparent data-[status=active]:before:absolute
              data-[status=active]:before:right-3 data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-3 data-[status=active]:before:h-0.5
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
      <div className="flex h-10 items-center gap-4">
        <TopNavLinks />
        <Separator orientation="vertical" />
        <div className="flex items-center gap-2">
          <ThemeToggle className="app-region-no-drag" />
          <SettingsDropdown className="app-region-no-drag" />
        </div>
      </div>

      <div className="flex items-center gap-2 justify-self-end">
        <WindowControls />
      </div>
    </TopNavContainer>
  )
}
