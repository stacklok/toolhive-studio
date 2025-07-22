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

function WrapperField({
  children,
  label,
  description,
  htmlFor,
}: {
  children: React.ReactNode
  label: string
  description: string
  htmlFor: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ThemeField() {
  const { theme, setTheme } = useTheme()

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      await setTheme(newTheme)
    } catch (error) {
      log.error('Failed to change theme:', error)
    }
  }

  return (
    <WrapperField
      label="Theme"
      description="Choose how ToolHive looks to you"
      htmlFor="theme-select"
    >
      <Select value={theme} onValueChange={handleThemeChange}>
        <SelectTrigger id="theme-select" className="w-32">
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
    </WrapperField>
  )
}

function TelemetryField() {
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

  const handleTelemetryToggle = async () => {
    if (isSentryLoading || isOptInPending || isOptOutPending) return
    if (isTelemetryEnabled) {
      await sentryOptOut()
    } else {
      await sentryOptIn()
    }
  }

  return (
    <WrapperField
      label="Error reporting"
      description="Help improve ToolHive by sending error reports to Sentry"
      htmlFor="telemetry"
    >
      <Switch
        id="telemetry"
        checked={isTelemetryEnabled || false}
        onCheckedChange={handleTelemetryToggle}
        disabled={isSentryLoading || isOptInPending || isOptOutPending}
      />
    </WrapperField>
  )
}

function AutoLaunchField() {
  const { mutateAsync: setAutoLaunch, isPending: isSetPending } =
    useSetAutoLaunch()

  const { data: autoLaunchStatus, isLoading: isAutoLaunchLoading } =
    useAutoLaunchStatus()

  const handleAutoLaunchToggle = async () => {
    if (isAutoLaunchLoading || isSetPending) return
    await setAutoLaunch(!autoLaunchStatus)
  }

  return (
    <WrapperField
      label="Start on login"
      description="Automatically start ToolHive when you log in to your computer"
      htmlFor="auto-launch"
    >
      <Switch
        id="auto-launch"
        checked={autoLaunchStatus || false}
        onCheckedChange={handleAutoLaunchToggle}
        disabled={isAutoLaunchLoading || isSetPending}
      />
    </WrapperField>
  )
}

function QuitConfirmationField() {
  const [skipQuitConfirmation, setSkipQuitConfirmation] =
    useState<boolean>(false)

  useEffect(() => {
    const quitConfirmationDisabled =
      localStorage.getItem(CONFIRM_QUIT_STORAGE_KEY) === 'true'
    setSkipQuitConfirmation(quitConfirmationDisabled)
  }, [])

  const handleQuitConfirmationToggle = () => {
    const newValue = !skipQuitConfirmation
    setSkipQuitConfirmation(newValue)

    if (newValue) {
      localStorage.setItem(CONFIRM_QUIT_STORAGE_KEY, 'true')
    } else {
      localStorage.removeItem(CONFIRM_QUIT_STORAGE_KEY)
    }
  }

  return (
    <WrapperField
      label="Skip quit confirmation"
      description="Skip the confirmation dialog when quitting ToolHive"
      htmlFor="quit-confirmation"
    >
      <Switch
        id="quit-confirmation"
        checked={skipQuitConfirmation}
        onCheckedChange={handleQuitConfirmationToggle}
      />
    </WrapperField>
  )
}

export function GeneralTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">General Settings</h2>

        <ThemeField />
        <AutoLaunchField />
        <TelemetryField />
        <QuitConfirmationField />
      </div>
    </div>
  )
}
