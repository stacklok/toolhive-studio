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

interface VersionTabProps {
  appInfo: AppVersionInfo | undefined
  isLoading: boolean
  error: Error | null
}

function VersionInfoWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Version Information</h2>
        <div className="text-muted-foreground text-sm">{children}</div>
      </div>
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
      <VersionInfoWrapper>Loading version information...</VersionInfoWrapper>
    )
  }

  if (error || !appInfo) {
    return (
      <VersionInfoWrapper>
        Failed to load version information
      </VersionInfoWrapper>
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
    <>
      <VersionInfoWrapper>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Desktop UI version</span>
            <Badge variant="secondary">
              {appInfo.currentVersion}{' '}
              {appInfo.isLatestVersion ? '(latest version)' : ''}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">ToolHive binary version</span>
            <Badge variant="secondary">{appInfo.toolhiveVersion}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Build type</span>
            <Badge variant={appInfo.isReleaseBuild ? 'default' : 'outline'}>
              {appInfo.isReleaseBuild ? 'Release' : 'Development'}
            </Badge>
          </div>
        </div>
      </VersionInfoWrapper>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">ToolHive Updates</h2>
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Automatically download and install ToolHive updates when a new
            release is available.
          </p>

          <Switch
            id="auto-update"
            checked={isAutoUpdateEnabled ?? true}
            onCheckedChange={() => {
              if (isAutoUpdateEnabledLoading || isSetAutoUpdatePending) return
              setAutoUpdate(!isAutoUpdateEnabled)
            }}
            disabled={isAutoUpdateEnabledLoading || isSetAutoUpdatePending}
          />
        </div>
        {appInfo.isNewVersionAvailable && isProduction && (
          <div>
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
          </div>
        )}
      </div>
    </>
  )
}
