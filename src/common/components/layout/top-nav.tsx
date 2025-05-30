import type { ComponentProps, HTMLProps } from "react";

import { twMerge } from "tailwind-merge";
import { CommandIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

function TopNavContainer(props: HTMLProps<HTMLElement>) {
  return (
    <nav
      {...props}
      className={twMerge(
        props.className,
        "sticky top-0 z-50",
        "bg-raised/10 backdrop-blur-xs",
        "border-mid h-12 border-b",
        "px-6 py-2",
        "flex items-center gap-8",
      )}
    >
      {props.children}
    </nav>
  );
}

function TopNavLogo() {
  return (
    <div className="flex items-center gap-2">
      <CommandIcon />
      <span className="text-lg font-semibold">ToolHive</span>
    </div>
  );
}

function TopNavLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={twMerge(
        props.className,
        "text-muted-foreground",
        "data-[status='active']:text-foreground",
        "hover:text-foreground",
        "transition-colors",
      )}
    />
  );
}

function TopNavLinks() {
  return (
    <div className="flex items-center gap-4">
      <TopNavLink to="/">Installed</TopNavLink>
      <TopNavLink to="/registry">Registry</TopNavLink>
    </div>
  );
}

export function TopNav(props: HTMLProps<HTMLElement>) {
  return (
    <TopNavContainer {...props}>
      <TopNavLogo />
      <TopNavLinks />
    </TopNavContainer>
  );
}
