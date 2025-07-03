import type { HTMLProps } from 'react'

import { ThemeToggle } from '../../theme/theme-toggle'
import { SettingsDropdown } from '../../settings/settings-dropdown'
import { WindowControls } from './window-controls'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from '../../ui/navigation-menu'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { LinkViewTransition } from '../../link-view-transition'
import { TopNavContainer } from './container'
import { Separator } from '../../ui/separator'
import { TopNavLogo } from './logo'
import { useConfirmQuit } from '@/common/hooks/use-confirm'

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
            <LinkViewTransition to="/">Installed</LinkViewTransition>
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
            <LinkViewTransition to="/registry">Registry</LinkViewTransition>
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
            <LinkViewTransition to="/clients">Clients</LinkViewTransition>
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
            <LinkViewTransition to="/secrets">Secrets</LinkViewTransition>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export function TopNav(props: HTMLProps<HTMLElement>) {
  const confirmQuit = useConfirmQuit()
  useEffect(() => {
    window.electronAPI.onUpdateDownloaded(() => {
      toast.info('Update downloaded and ready to install', {
        duration: Infinity,
        dismissible: true,
        id: 'update-notification',
        cancel: {
          label: 'Dismiss',
          onClick: () => toast.dismiss('update-notification'),
        },
        action: {
          label: 'Restart now',
          onClick: async () => {
            const confirmed = await confirmQuit()
            if (confirmed) {
              window.electronAPI.quitApp()
            }
          },
        },
      })
    })
  }, [confirmQuit])

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
