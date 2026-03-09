import type { HTMLProps } from 'react'
import { HelpDropdown } from '../../help'
import { WindowControls } from './window-controls'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from '../../ui/navigation-menu'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { LinkViewTransition } from '../../link-view-transition'
import { TopNavContainer } from './container'
import {
  Server,
  CloudDownload,
  Settings as SettingsIcon,
  ArrowUpCircle,
  MessageCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'
import { useAppVersion } from '@/common/hooks/use-app-version'
import { cn } from '@/common/lib/utils'
import { getOsDesignVariant } from '@/common/lib/os-design'
import { NavSeparator } from './nav-separator'
import { NavIconButton } from './nav-icon-button'

interface NavButtonProps {
  to: string
  icon: LucideIcon
  children: React.ReactNode
  isActive?: boolean
}

function NavButton({ to, icon: Icon, children, isActive }: NavButtonProps) {
  return (
    <LinkViewTransition
      to={to}
      className={cn(
        'app-region-no-drag',
        'flex h-9 items-center gap-2 rounded-full px-4',
        'text-sm font-medium transition-colors',
        isActive
          ? 'bg-nav-button-active-bg text-nav-button-active-text'
          : 'bg-transparent text-white/90 hover:bg-white/10 hover:text-white'
      )}
    >
      <Icon className="size-4" />
      {children}
    </LinkViewTransition>
  )
}

function useIsActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (paths: string[]) =>
    paths.some((p) => pathname.startsWith(p) || pathname === p)
}

function TopNavLinks() {
  const isActive = useIsActive()

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-2">
        <NavigationMenuItem>
          <NavButton
            to="/group/default"
            icon={Server}
            isActive={isActive(['/group/', '/mcp-optimizer'])}
          >
            MCP Servers
          </NavButton>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavButton
            to="/registry"
            icon={CloudDownload}
            isActive={isActive(['/registry'])}
          >
            Registry
          </NavButton>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export function TopNav(props: HTMLProps<HTMLElement>) {
  const { data: appVersion } = useAppVersion()
  const isProduction = import.meta.env.MODE === 'production'
  const isActive = useIsActive()
  const showUpdateBadge = !!(appVersion?.isNewVersionAvailable && isProduction)

  useEffect(() => {
    const cleanup = window.electronAPI.onUpdateDownloaded(() => {
      toast.info('Update downloaded and ready to install', {
        duration: Infinity,
        dismissible: true,
        closeButton: false,
        id: 'update-notification',
        classNames: {
          cancelButton: 'rounded-full!',
          actionButton:
            'rounded-full! bg-nav-button-active-bg! text-nav-button-active-text! hover:bg-nav-button-active-bg/90!',
        },
        cancel: {
          label: 'Dismiss',
          onClick: () => toast.dismiss('update-notification'),
        },
        action: {
          label: 'Restart now',
          onClick: () => {
            window.electronAPI.installUpdateAndRestart()
          },
        },
      })
    })

    return cleanup
  }, [])

  return (
    <TopNavContainer {...props}>
      <div className="flex h-10 items-center">
        <TopNavLinks />
      </div>
      <div
        className="app-region-no-drag flex h-full items-center justify-self-end"
      >
        <div className="flex h-full items-center gap-1 pl-2">
          <HelpDropdown className="app-region-no-drag" />
          <NavIconButton
            asChild
            isActive={isActive(['/settings'])}
            aria-label="Settings"
            className="app-region-no-drag relative"
          >
            <LinkViewTransition to="/settings">
              <SettingsIcon className="size-5" />
              {showUpdateBadge && (
                <span className="absolute -top-0.5 -right-0.5">
                  <ArrowUpCircle className="size-3 fill-blue-500" />
                </span>
              )}
            </LinkViewTransition>
          </NavIconButton>
          {/* macOS: separator between settings and assistant (no window controls on the right) */}
          {getOsDesignVariant() === 'mac' && <NavSeparator />}
          <NavIconButton
            asChild
            isActive={isActive(['/playground'])}
            aria-label="Assistant"
            aria-role="link"
            className="app-region-no-drag"
          >
            <LinkViewTransition to="/playground">
              <MessageCircle className="size-5" />
            </LinkViewTransition>
          </NavIconButton>
        </div>
        {/* Windows: separator between icon group and window controls */}
        {getOsDesignVariant() !== 'mac' && <NavSeparator />}
        <WindowControls />
      </div>
    </TopNavContainer>
  )
}
