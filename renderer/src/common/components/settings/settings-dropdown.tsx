import { SettingsIcon, Check } from 'lucide-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { Button } from '@/common/components/ui/button'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'

export function SettingsDropdown({ className }: { className?: string }) {
  const [isAutoLaunchEnabled, setIsAutoLaunchEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadAutoLaunchStatus = async () => {
    try {
      setIsLoading(true)
      if (window.electronAPI) {
        const status = await window.electronAPI.getAutoLaunchStatus()
        console.log(`status ${status}`)
        setIsAutoLaunchEnabled(status)
      }
    } catch (error) {
      console.error('Failed to load auto-launch status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDropdownOpenChange = (open: boolean) => {
    if (open) {
      loadAutoLaunchStatus()
    }
  }

  const handleAutoLaunchToggle = async () => {
    if (isLoading) return

    try {
      setIsLoading(true)
      if (window.electronAPI) {
        const newStatus =
          await window.electronAPI.setAutoLaunch(!isAutoLaunchEnabled)
        setIsAutoLaunchEnabled(newStatus)
        toast.success(
          newStatus
            ? 'Auto-launch enabled - ToolHive will start with your system'
            : 'Auto-launch disabled'
        )
      }
    } catch (error) {
      console.error('Failed to update auto-launch setting:', error)
      toast.error('Failed to update auto-launch setting')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuit = async () => {
    if (window.electronAPI) {
      await window.electronAPI.quitApp()
    }
  }

  if (typeof window === 'undefined' || !window.electronAPI) {
    return null
  }

  return (
    <DropdownMenu onOpenChange={handleDropdownOpenChange}>
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
          onClick={handleAutoLaunchToggle}
          disabled={isLoading}
          className="flex cursor-pointer items-center justify-between"
        >
          <span>Start on login</span>
          {isAutoLaunchEnabled && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <span>Check for updates</span>
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
