import { Label } from '../../ui/label'
import { Switch } from '../../ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import {
  useAutoLaunchStatus,
  useSetAutoLaunch,
} from '@/common/hooks/use-auto-launch'
import { useTheme } from '@/common/hooks/use-theme'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import log from 'electron-log/renderer'

const CONFIRM_QUIT_STORAGE_KEY = 'doNotShowAgain_confirm_quit'

export function GeneralTab() {
  const { data: autoLaunchStatus, isLoading: isAutoLaunchLoading } =
    useAutoLaunchStatus()
  const { mutateAsync: setAutoLaunch, isPending: isSetPending } =
    useSetAutoLaunch()
  const { theme, setTheme } = useTheme()
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
  const [skipQuitConfirmation, setSkipQuitConfirmation] =
    useState<boolean>(false)

  useEffect(() => {
    const quitConfirmationDisabled =
      localStorage.getItem(CONFIRM_QUIT_STORAGE_KEY) === 'true'
    setSkipQuitConfirmation(quitConfirmationDisabled)
  }, [])

  const handleAutoLaunchToggle = async () => {
    if (isAutoLaunchLoading || isSetPending) return
    await setAutoLaunch(!autoLaunchStatus)
  }

  const handleTelemetryToggle = async () => {
    if (isSentryLoading || isOptInPending || isOptOutPending) return
    if (isTelemetryEnabled) {
      await sentryOptOut()
    } else {
      await sentryOptIn()
    }
  }

  const handleQuitConfirmationToggle = () => {
    const newValue = !skipQuitConfirmation
    setSkipQuitConfirmation(newValue)

    if (newValue) {
      localStorage.setItem(CONFIRM_QUIT_STORAGE_KEY, 'true')
    } else {
      localStorage.removeItem(CONFIRM_QUIT_STORAGE_KEY)
    }
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      await setTheme(newTheme)
    } catch (error) {
      log.error('Failed to change theme:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">General Settings</h2>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="theme-select">Theme</Label>
            <p className="text-muted-foreground text-sm">
              Choose how ToolHive looks to you
            </p>
          </div>
          <Select value={theme} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="size-4" />
                  Light
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="size-4" />
                  Dark
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <Monitor className="size-4" />
                  System
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-launch">Start on login</Label>
            <p className="text-muted-foreground text-sm">
              Automatically start ToolHive when you log in to your computer
            </p>
          </div>
          <Switch
            id="auto-launch"
            checked={autoLaunchStatus || false}
            onCheckedChange={handleAutoLaunchToggle}
            disabled={isAutoLaunchLoading || isSetPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="telemetry">Error reporting</Label>
            <p className="text-muted-foreground text-sm">
              Help improve ToolHive by sending error reports to Sentry
            </p>
          </div>
          <Switch
            id="telemetry"
            checked={isTelemetryEnabled || false}
            onCheckedChange={handleTelemetryToggle}
            disabled={isSentryLoading || isOptInPending || isOptOutPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="quit-confirmation">Skip quit confirmation</Label>
            <p className="text-muted-foreground text-sm">
              Skip the confirmation dialog when quitting ToolHive
            </p>
          </div>
          <Switch
            id="quit-confirmation"
            checked={skipQuitConfirmation}
            onCheckedChange={handleQuitConfirmationToggle}
          />
        </div>
      </div>
    </div>
  )
}
