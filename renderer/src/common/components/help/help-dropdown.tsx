import { HelpCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { NavIconButton } from '@/common/components/layout/top-nav/nav-icon-button'

export function HelpDropdown({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NavIconButton aria-label="Help" className={className}>
          <HelpCircle className="size-5" />
        </NavIconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <a
            href="https://docs.stacklok.com/toolhive"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            Documentation
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://discord.gg/stacklok"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            Discord Community
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://github.com/stacklok/toolhive-studio/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            Send Feedback
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://github.com/stacklok/toolhive-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            GitHub Repository
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://www.iubenda.com/privacy-policy/78678281"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            Privacy Policy
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
