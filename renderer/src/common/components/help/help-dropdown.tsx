import { HelpCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { Button } from '@/common/components/ui/button'
import { twMerge } from 'tailwind-merge'

export function HelpDropdown({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={twMerge('cursor-pointer', className)}
        >
          <HelpCircle className="text-muted-foreground size-4" />
          <span className="sr-only">Help</span>
        </Button>
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
            href="https://github.com/liamstorkey-elmo/toolhive-studio/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            Send Feedback
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://github.com/liamstorkey-elmo/toolhive-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            GitHub Repository
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://www.iubenda.com/privacy-policy/29074746"
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
