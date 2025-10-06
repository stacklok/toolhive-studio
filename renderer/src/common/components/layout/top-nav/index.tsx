import type { HTMLProps } from 'react'
import { HelpDropdown } from '../../help'
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
import { useConfirmQuit } from '@/common/hooks/use-confirm-quit'
import { QuitConfirmationListener } from './quit-confirmation-listener'
import { ArrowUpCircle, SettingsIcon } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import { Button } from '../../ui/button'
import { useAppVersion } from '@/common/hooks/use-app-version'

function TopNavLinks() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isGroupRoute = pathname.startsWith('/group/')

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-0">
        <NavigationMenuItem>
          <NavigationMenuLink
            className="app-region-no-drag text-muted-foreground
              hover:text-foreground focus:text-foreground
              data-[status=active]:text-foreground
              data-[status=active]:before:bg-foreground
              focus-visible:ring-ring/50 relative px-3 py-2 text-sm
              transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px]
              focus-visible:outline-1 data-[status=active]:bg-transparent
              data-[status=active]:before:absolute
              data-[status=active]:before:right-3
              data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-3
              data-[status=active]:before:h-0.5
              data-[status=active]:before:rounded-t-[1px]
              data-[status=active]:before:opacity-90
              data-[status=active]:before:content-['']
              data-[status=active]:hover:bg-transparent
              data-[status=active]:focus:bg-transparent
              data-[status=hover]:bg-transparent"
            data-status={isGroupRoute ? 'active' : undefined}
            asChild
          >
            <LinkViewTransition to="/group/default">
              MCP Servers
            </LinkViewTransition>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className="app-region-no-drag text-muted-foreground
              hover:text-foreground focus:text-foreground
              data-[status=active]:text-foreground
              data-[status=active]:before:bg-foreground
              focus-visible:ring-ring/50 relative px-3 py-2 text-sm
              transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px]
              focus-visible:outline-1 data-[status=active]:bg-transparent
              data-[status=active]:before:absolute
              data-[status=active]:before:right-3
              data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-3
              data-[status=active]:before:h-0.5
              data-[status=active]:before:rounded-t-[1px]
              data-[status=active]:before:opacity-90
              data-[status=active]:before:content-['']
              data-[status=active]:hover:bg-transparent
              data-[status=active]:focus:bg-transparent
              data-[status=hover]:bg-transparent"
            asChild
          >
            <LinkViewTransition to="/registry">Registry</LinkViewTransition>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink
            className="app-region-no-drag text-muted-foreground
              hover:text-foreground focus:text-foreground
              data-[status=active]:text-foreground
              data-[status=active]:before:bg-foreground
              focus-visible:ring-ring/50 relative px-3 py-2 text-sm
              transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px]
              focus-visible:outline-1 data-[status=active]:bg-transparent
              data-[status=active]:before:absolute
              data-[status=active]:before:right-3
              data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-3
              data-[status=active]:before:h-0.5
              data-[status=active]:before:rounded-t-[1px]
              data-[status=active]:before:opacity-90
              data-[status=active]:before:content-['']
              data-[status=active]:hover:bg-transparent
              data-[status=active]:focus:bg-transparent"
            asChild
          >
            <LinkViewTransition to="/playground">Playground</LinkViewTransition>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink
            className="app-region-no-drag text-muted-foreground
              hover:text-foreground focus:text-foreground
              data-[status=active]:text-foreground
              data-[status=active]:before:bg-foreground
              focus-visible:ring-ring/50 relative px-3 py-2 text-sm
              transition-all outline-none hover:bg-transparent
              focus:bg-transparent focus-visible:ring-[3px]
              focus-visible:outline-1 data-[status=active]:bg-transparent
              data-[status=active]:before:absolute
              data-[status=active]:before:right-3
              data-[status=active]:before:bottom-[-14px]
              data-[status=active]:before:left-3
              data-[status=active]:before:h-0.5
              data-[status=active]:before:rounded-t-[1px]
              data-[status=active]:before:opacity-90
              data-[status=active]:before:content-['']
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
  const { data: appVersion } = useAppVersion()

  useEffect(() => {
    const cleanup = window.electronAPI.onUpdateDownloaded(() => {
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
              window.electronAPI.installUpdateAndRestart()
            }
          },
        },
      })
    })

    // Cleanup function to remove the event listener
    return cleanup
  }, [confirmQuit])

  return (
    <TopNavContainer {...props}>
      <QuitConfirmationListener />
      <div className="flex h-10 items-center">
        <TopNavLinks />
        <Separator orientation="vertical" className="mr-4 ml-2" />
        <div className="flex items-center gap-2">
          <LinkViewTransition to="/settings" className="app-region-no-drag">
            {appVersion?.isNewVersionAvailable && appVersion.isReleaseBuild ? (
              <Tooltip>
                <TooltipTrigger asChild autoFocus={false}>
                  <Button variant="ghost" size="sm" className="cursor-pointer">
                    <div className="relative inline-flex items-center">
                      <SettingsIcon className="text-muted-foreground size-4" />
                      <div className="absolute -top-1 -right-1">
                        <div className="bg-background rounded-full p-0.5">
                          <ArrowUpCircle className="size-2.5 text-blue-500" />
                        </div>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New update available</TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="ghost" size="sm" className="cursor-pointer">
                <SettingsIcon className="text-muted-foreground size-4" />
              </Button>
            )}
          </LinkViewTransition>
          <HelpDropdown className="app-region-no-drag" />
        </div>
      </div>

      <div className="flex items-center gap-2 justify-self-end">
        <WindowControls />
      </div>
    </TopNavContainer>
  )
}
