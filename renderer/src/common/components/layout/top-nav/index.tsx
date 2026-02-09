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
import { useConfirmQuit } from '@/common/hooks/use-confirm-quit'
import { QuitConfirmationListener } from './quit-confirmation-listener'
import {
  Server,
  CloudDownload,
  FlaskConical,
  Lock,
  Settings as SettingsIcon,
  ArrowUpCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'
import { useAppVersion } from '@/common/hooks/use-app-version'
import { cn } from '@/common/lib/utils'

interface NavButtonProps {
  to: string
  icon: LucideIcon
  children: React.ReactNode
  isActive?: boolean
  badge?: React.ReactNode
}

function NavButton({
  to,
  icon: Icon,
  children,
  isActive,
  badge,
}: NavButtonProps) {
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
      <span className="relative">
        <Icon className="size-4" />
        {badge}
      </span>
      {children}
    </LinkViewTransition>
  )
}

function TopNavLinks({ showUpdateBadge }: { showUpdateBadge?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const isActive = (paths: string[]) =>
    paths.some((p) => pathname.startsWith(p) || pathname === p)

  const updateBadge = showUpdateBadge ? (
    <span className="absolute -top-1 -right-1">
      <ArrowUpCircle className="size-3 fill-blue-500" />
    </span>
  ) : null

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
        <NavigationMenuItem>
          <NavButton
            to="/playground"
            icon={FlaskConical}
            isActive={isActive(['/playground'])}
          >
            Playground
          </NavButton>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavButton
            to="/secrets"
            icon={Lock}
            isActive={isActive(['/secrets'])}
          >
            Secrets
          </NavButton>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavButton
            to="/settings"
            icon={SettingsIcon}
            isActive={isActive(['/settings'])}
            badge={updateBadge}
          >
            Settings
          </NavButton>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <HelpDropdown className="app-region-no-drag" />
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export function TopNav(props: HTMLProps<HTMLElement>) {
  const confirmQuit = useConfirmQuit()
  const { data: appVersion } = useAppVersion()
  const isProduction = import.meta.env.MODE === 'production'

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

    return cleanup
  }, [confirmQuit])

  return (
    <TopNavContainer {...props}>
      <QuitConfirmationListener />
      <div className="flex h-10 items-center">
        <TopNavLinks
          showUpdateBadge={
            !!(appVersion?.isNewVersionAvailable && isProduction)
          }
        />
      </div>
      <div className="flex items-center gap-2 justify-self-end">
        <WindowControls />
      </div>
    </TopNavContainer>
  )
}
