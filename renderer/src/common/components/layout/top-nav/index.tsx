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
  FlaskConical,
  PackageOpen,
  BookOpen,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'
import { useAppVersion } from '@/common/hooks/use-app-version'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/common/lib/utils'
import { getOsDesignVariant } from '@/common/lib/os-design'
import { trackEvent } from '@/common/lib/analytics'
import { NavSeparator } from './nav-separator'
import { NavIconButton } from './nav-icon-button'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '@utils/feature-flags'
import { usePermissions } from '@/common/contexts/permissions'
import { PERMISSION_KEYS } from '@/common/contexts/permissions/permission-keys'
import { buildOnrampDocsUrl } from '@/common/lib/onramp-url'
import { useInstanceId } from '@/common/hooks/use-instance-id'

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
  const isSkillsEnabled = useFeatureFlag(featureFlagKeys.SKILLS)
  const { canShow } = usePermissions()

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-2">
        {isSkillsEnabled && (
          <NavigationMenuItem>
            <NavButton
              to="/skills"
              icon={BookOpen}
              isActive={isActive(['/skills'])}
            >
              Skills
            </NavButton>
          </NavigationMenuItem>
        )}
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
        {canShow(PERMISSION_KEYS.PLAYGROUND_MENU) && (
          <NavigationMenuItem>
            <NavButton
              to="/playground"
              icon={FlaskConical}
              isActive={isActive(['/playground'])}
            >
              Playground
            </NavButton>
          </NavigationMenuItem>
        )}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function EnterpriseUpgradeButton() {
  const { instanceId } = useInstanceId()
  const href = buildOnrampDocsUrl('/enterprise', {
    campaign: 'enterprise-upgrade',
    content: 'app-header',
    instanceId,
  })

  return (
    <Button
      variant="success"
      className="app-region-no-drag rounded-full font-normal"
      size="sm"
      asChild
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('Onramp: Upgrade to Enterprise clicked')}
      >
        <PackageOpen className="size-4" />
        Upgrade to Enterprise
      </a>
    </Button>
  )
}

interface TopNavProps extends HTMLProps<HTMLElement> {
  isEnterprise?: boolean
}

export function TopNav({ isEnterprise = false, ...props }: TopNavProps) {
  const { data: appVersion } = useAppVersion()
  const isProduction = import.meta.env.MODE === 'production'
  const isActive = useIsActive()
  const { canShow } = usePermissions()
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
        {!isEnterprise && <EnterpriseUpgradeButton />}
        <div className="flex h-full items-center gap-1 pl-2">
          {canShow(PERMISSION_KEYS.HELP_MENU) && (
            <HelpDropdown
              className="app-region-no-drag"
              isEnterprise={isEnterprise}
            />
          )}
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
        </div>
        {/* Windows: separator between icon group and window controls */}
        {getOsDesignVariant() !== 'mac' && <NavSeparator />}
        <WindowControls />
      </div>
    </TopNavContainer>
  )
}
