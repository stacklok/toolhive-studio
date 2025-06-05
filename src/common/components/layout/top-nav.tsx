import type { HTMLProps } from "react";

import { twMerge } from "tailwind-merge";
import { CommandIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "../theme/theme-toggle";

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

function TopNavLinks() {
  return (
    <div className="flex items-center gap-2">
      <Link to="/">Installed</Link>
    </div>
  );
}

export function TopNav(props: HTMLProps<HTMLElement>) {
  return (
    <TopNavContainer {...props}>
      <TopNavLogo />
      <TopNavLinks />
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </TopNavContainer>
  );
}
