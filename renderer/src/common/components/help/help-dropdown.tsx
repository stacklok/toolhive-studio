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
  const handleOpenDocumentation = () => {
    window.electronAPI.openExternal(
      'https://github.com/StacklokLabs/toolhive-studio?tab=readme-ov-file#getting-started'
    )
  }

  const handleOpenDiscord = () => {
    window.electronAPI.openExternal('https://discord.gg/stacklok')
  }

  const handleOpenFeedback = () => {
    window.electronAPI.openExternal(
      'https://github.com/StacklokLabs/toolhive-studio/issues'
    )
  }

  const handleOpenGitHub = () => {
    window.electronAPI.openExternal(
      'https://github.com/StacklokLabs/toolhive-studio'
    )
  }

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
        <DropdownMenuItem
          onClick={handleOpenDocumentation}
          className="cursor-pointer"
        >
          Documentation
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleOpenDiscord}
          className="cursor-pointer"
        >
          Discord Community
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleOpenFeedback}
          className="cursor-pointer"
        >
          Send Feedback
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenGitHub} className="cursor-pointer">
          GitHub Repository
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
