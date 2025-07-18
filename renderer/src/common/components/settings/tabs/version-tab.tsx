import { Badge } from '../../ui/badge'
import { useState, useEffect } from 'react'

export function VersionTab() {
  const [appInfo, setAppInfo] = useState<{
    appVersion: string
    isReleaseBuild: boolean
    toolhiveVersion: string
  }>({
    appVersion: '',
    isReleaseBuild: false,
    toolhiveVersion: '',
  })

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const version = await window.electronAPI.getAppVersion()
        const release = await window.electronAPI.isReleaseBuild()
        const toolhiveVersion = await window.electronAPI.getToolhiveVersion()
        setAppInfo({
          appVersion: version,
          isReleaseBuild: release,
          toolhiveVersion,
        })
      } catch (error) {
        console.error('Failed to fetch version info:', error)
      }
    }
    fetchVersionInfo()
  }, [])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Version Information</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Desktop UI version</span>
            <Badge variant="secondary">
              {appInfo.appVersion || 'Loading...'}
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
      </div>
    </div>
  )
}
