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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sun, Moon, Monitor } from 'lucide-react'
import log from 'electron-log/renderer'
import { trackEvent } from '@/common/lib/analytics'
import { ExperimentalFeatures } from './components/experimental-features'
import { WrapperField } from './components/wrapper-field'
import { Separator } from '../../ui/separator'
import { SettingsSectionTitle } from './components/settings-section-title'

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
        <SelectTrigger id="theme-select" className="w-[180px]">
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
      trackEvent('Telemetry disabled', {
        telemetry_enabled: 'false',
      })
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
  const { data: skipQuitConfirmation, isPending: isLoading } = useQuery({
    queryFn: window.electronAPI.getSkipQuitConfirmation,
    queryKey: ['skip-quit-confirmation'],
  })

  const queryClient = useQueryClient()

  const { mutate: setSkipQuitConfirmation, isPending: isSaving } = useMutation({
    mutationFn: (skip: boolean) =>
      window.electronAPI.setSkipQuitConfirmation(skip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skip-quit-confirmation'] })
    },
  })

  const handleQuitConfirmationToggle = (checked: boolean) => {
    setSkipQuitConfirmation(checked)
  }

  return (
    <WrapperField
      label="Quit confirmation"
      description="Skip the confirmation dialog when quitting ToolHive"
      htmlFor="quit-confirmation"
    >
      <Switch
        id="quit-confirmation"
        checked={skipQuitConfirmation ?? false}
        onCheckedChange={handleQuitConfirmationToggle}
        disabled={isLoading || isSaving}
      />
    </WrapperField>
  )
}

export function GeneralTab() {
  return (
    <div className="space-y-3">
      <SettingsSectionTitle>General</SettingsSectionTitle>
      <div className="flex flex-col gap-3 pt-1 pb-5">
        <ThemeField />
        <Separator />
        <AutoLaunchField />
        <Separator />
        <TelemetryField />
        <Separator />
        <QuitConfirmationField />
        <Separator />
      </div>
      <ExperimentalFeatures />
    </div>
  )
}
