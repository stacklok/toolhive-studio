import type { HTMLProps } from 'react'

import { twMerge } from 'tailwind-merge'
import { CommandIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ThemeToggle } from '../theme/theme-toggle'
import { SettingsDropdown } from '../settings/settings-dropdown'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from '../ui/navigation-menu'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { isFeatureEnabled } from '@/feature-flags'

function TopNavContainer(props: HTMLProps<HTMLElement>) {
  return (
    <nav
      {...props}
      className={twMerge(
        props.className,
        'sticky top-0 z-50',
        'bg-raised/10 backdrop-blur-xs',
        'border-mid h-12 border-b',
        'px-6 py-2',
        'flex items-center gap-8',
        window.electronAPI.isMac ? 'app-region-drag pl-24' : undefined
      )}
    >
      {props.children}
    </nav>
  )
}

function TopNavLogo() {
  return (
    <div className="flex items-center gap-2">
      <CommandIcon />
      <span className="text-lg font-semibold">ToolHive</span>
    </div>
  )
}

function TopNavLinks() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink className="app-region-no-drag" asChild>
            <Link to="/">Installed</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className="app-region-no-drag" asChild>
            <Link to="/store">Store</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className="app-region-no-drag" asChild>
            <Link to="/clients">Clients</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className="app-region-no-drag" asChild>
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
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle className="app-region-no-drag" />
        <SettingsDropdown className="app-region-no-drag" />
      </div>
    </TopNavContainer>
  )
}
