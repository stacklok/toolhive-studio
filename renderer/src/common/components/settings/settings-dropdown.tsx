import { SettingsIcon, Check, Loader } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/common/components/ui/dropdown-menu'
import { Button } from '@/common/components/ui/button'
import { twMerge } from 'tailwind-merge'
import {
  useAutoLaunchStatus,
  useSetAutoLaunch,
} from '@/common/hooks/use-auto-launch'
import { useConfirmQuit } from '@/common/hooks/use-confirm-quit'
import { useMutation, useQuery } from '@tanstack/react-query'

export function SettingsDropdown({ className }: { className?: string }) {
  const { data: autoLaunchStatus, isLoading, refetch } = useAutoLaunchStatus()
  const { mutateAsync: setAutoLaunch, isPending: isSetPending } =
    useSetAutoLaunch()
  const confirmQuit = useConfirmQuit()

  const handleDropdownOpenChange = (open: boolean) => {
    if (open) {
      refetch()
    }
  }

  const handleAutoLaunchToggle = async () => {
    if (isLoading || isSetPending) return
    setAutoLaunch(!autoLaunchStatus)
  }

  const handleQuit = async () => {
    const confirmed = await confirmQuit()
    if (confirmed && window.electronAPI) {
      await window.electronAPI.quitApp()
    }
  }

  ///////////////////////////////////////////////////
  // Sentry
  ///////////////////////////////////////////////////

  const { mutateAsync: sentryOptIn, isPending: isOptInPending } = useMutation({
    mutationFn: window.electronAPI.sentry.optIn,
  })

  const { mutateAsync: sentryOptOut, isPending: isOptOutPending } = useMutation(
    {
      mutationFn: window.electronAPI.sentry.optOut,
    }
  )

  const { data: isTelemetryEnabled, isPending: isSentryLoading } = useQuery({
    queryFn: window.electronAPI.sentry.isEnabled,
    queryKey: ['sentry.is-enabled', { isOptInPending, isOptOutPending }],
  })

  const isSentryPending: boolean =
    isSentryLoading || isOptInPending || isOptOutPending

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
          {autoLaunchStatus && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => (isTelemetryEnabled ? sentryOptOut() : sentryOptIn())}
          disabled={isSentryPending}
        >
          <span>Error reporting</span>
          {isSentryPending ? (
            <Loader className="ml-auto h-4 w-4 animate-spin" />
          ) : isTelemetryEnabled ? (
            <Check className="ml-auto h-4 w-4" />
          ) : null}
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
