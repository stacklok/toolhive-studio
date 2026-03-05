import { Badge } from '../../ui/badge'
import {
  useCurrentUpdateState,
  type AppVersionInfo,
} from '../../../hooks/use-app-version'
import { Switch } from '../../ui/switch'
import {
  useAutoUpdateStatus,
  useSetAutoUpdate,
} from '@/common/hooks/use-auto-update'
import { Button } from '../../ui/button'
import { Alert, AlertDescription } from '../../ui/alert'
import { AlertCircleIcon, Download } from 'lucide-react'
import { trackEvent } from '@/common/lib/analytics'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Separator } from '../../ui/separator'
import { SettingsSectionTitle } from './components/settings-section-title'
import { SettingsRow } from './components/settings-row'
import { WrapperField } from './components/wrapper-field'

interface VersionTabProps {
  appInfo: AppVersionInfo | undefined
  isLoading: boolean
  error: Error | null
}

function VersionBadge({
  version,
  isLatest,
}: {
  version: string
  isLatest: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text/text-muted-foreground">{version}</span>
      {isLatest && <Badge variant="success">Latest</Badge>}
    </div>
  )
}

export function VersionTab({ appInfo, isLoading, error }: VersionTabProps) {
  const isProduction = import.meta.env.MODE === 'production'
  const { data: updateState, isLoading: isUpdateStateLoading } =
    useCurrentUpdateState()
  const isCheckingOrDownloading =
    isUpdateStateLoading ||
    updateState === 'checking' ||
    updateState === 'not-available' ||
    updateState === 'downloading'

  const { data: isAutoUpdateEnabled, isLoading: isAutoUpdateEnabledLoading } =
    useAutoUpdateStatus()
  const { mutateAsync: setAutoUpdate, isPending: isSetAutoUpdatePending } =
    useSetAutoUpdate()

  useEffect(() => {
    if (updateState === 'not-available') {
      toast.info('Update not yet available', {
        id: 'update-not-available',
        description:
          'The update server is still processing the latest release. Please try again in a few minutes.',
        duration: 6000,
      })
    }
  }, [updateState])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SettingsSectionTitle>Version</SettingsSectionTitle>
        <p className="text-muted-foreground text-sm">
          Loading version information...
        </p>
      </div>
    )
  }

  if (error || !appInfo) {
    return (
      <div className="space-y-3">
        <SettingsSectionTitle>Version</SettingsSectionTitle>
        <p className="text-muted-foreground text-sm">
          Failed to load version information
        </p>
      </div>
    )
  }

  const handleManualUpdate = () => {
    const isLinux = window.electronAPI?.isLinux
    if (isLinux) {
      window.open('https://github.com/stacklok/toolhive-studio/releases/latest')

      trackEvent('redirect to github releases', {
        pageName: '/settings/version',
        'page.tab': 'version',
        'latest.version': appInfo.latestVersion,
        'current.version': appInfo.currentVersion,
        'is.new.version.available': appInfo?.isNewVersionAvailable,
      })

      return
    }

    window.electronAPI.manualUpdate()
    trackEvent('manual-update', {
      pageName: '/settings/version',
      'page.tab': 'version',
      'latest.version': appInfo.latestVersion,
      'current.version': appInfo.currentVersion,
      'is.new.version.available': appInfo?.isNewVersionAvailable,
    })
  }

  const getButtonText = () => {
    if (updateState === 'checking' || updateState === 'not-available') {
      return 'Checking...'
    }
    if (updateState === 'downloading') {
      return 'Downloading...'
    }
    return 'Download'
  }

  return (
    <div className="space-y-3">
      <SettingsSectionTitle>Version</SettingsSectionTitle>
      <div className="flex flex-col gap-3 pt-1 pb-5">
        <SettingsRow label="Desktop UI version">
          <VersionBadge
            version={appInfo.currentVersion}
            isLatest={!appInfo.isNewVersionAvailable}
          />
        </SettingsRow>
        <Separator />
        <SettingsRow label="ToolHive binary version">
          <VersionBadge
            version={appInfo.toolhiveVersion}
            isLatest={!appInfo.isNewVersionAvailable}
          />
        </SettingsRow>
        <Separator />
        <SettingsRow label="Build type">
          <span className="text-muted-foreground text-sm leading-5.5">
            {appInfo.isReleaseBuild ? 'Release' : 'Development'}
          </span>
        </SettingsRow>
        <Separator />
      </div>

      <SettingsSectionTitle>Updates</SettingsSectionTitle>
      <div className="flex flex-col gap-3 py-1">
        <WrapperField
          label="Downloads"
          description="Automatically download and install ToolHive updates when a new release is available."
          htmlFor="auto-update"
        >
          <Switch
            id="auto-update"
            checked={isAutoUpdateEnabled ?? true}
            onCheckedChange={() => {
              if (isAutoUpdateEnabledLoading || isSetAutoUpdatePending) return
              setAutoUpdate(!isAutoUpdateEnabled)
            }}
            disabled={isAutoUpdateEnabledLoading || isSetAutoUpdatePending}
          />
        </WrapperField>
        <Separator />
      </div>

      {appInfo.isNewVersionAvailable && isProduction && (
        <Alert className="flex h-full items-center">
          <AlertDescription className="flex w-full items-center gap-2">
            <AlertCircleIcon className="flex size-4 items-center" />
            <div className="flex w-full items-center justify-between">
              <div className="font-medium">
                A new version {appInfo.latestVersion} is available
              </div>
              <Button
                variant="outline"
                disabled={isCheckingOrDownloading}
                onClick={() => {
                  handleManualUpdate()
                }}
              >
                <Download className="size-4" /> {getButtonText()}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
