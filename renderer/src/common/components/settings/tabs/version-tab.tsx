import { Badge } from '../../ui/badge'
import { useAppVersion } from '../../../hooks/use-app-version'

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

export function VersionTab() {
  const { data: appInfo, isLoading, error } = useAppVersion()

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

  return (
    <VersionInfoWrapper>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Desktop UI version</span>
          <Badge variant="secondary">{appInfo.appVersion}</Badge>
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
  )
}
