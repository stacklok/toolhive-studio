import { SettingsIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { Button } from '@/common/components/ui/button'
import { twMerge } from 'tailwind-merge'
import { useConfirmQuit } from '@/common/hooks/use-confirm-quit'
import { LinkViewTransition } from '../link-view-transition'

export function SettingsDropdown({ className }: { className?: string }) {
  const confirmQuit = useConfirmQuit()

  const handleQuit = async () => {
    const confirmed = await confirmQuit()
    if (confirmed && window.electronAPI) {
      await window.electronAPI.quitApp()
    }
  }

  if (typeof window === 'undefined' || !window.electronAPI) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={twMerge('cursor-pointer', className)}
        >
          <SettingsIcon className="text-muted-foreground size-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          asChild
          className="flex cursor-pointer items-center justify-between"
        >
          <LinkViewTransition to="/settings">Settings</LinkViewTransition>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleQuit}
          className="cursor-pointer"
        >
          <span>Quit</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
