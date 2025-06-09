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
        'flex items-center gap-8'
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
          <NavigationMenuLink asChild>
            <Link to="/">Installed</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link to="/store">Store</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link to="/clients">Clients</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export function TopNav(props: HTMLProps<HTMLElement>) {
  return (
    <TopNavContainer {...props}>
      <TopNavLogo />
      <TopNavLinks />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <SettingsDropdown />
      </div>
    </TopNavContainer>
  )
}
