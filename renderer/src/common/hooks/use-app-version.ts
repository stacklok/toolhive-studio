import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import log from 'electron-log/renderer'

interface AppVersionInfo {
  appVersion: string
  isReleaseBuild: boolean
  toolhiveVersion: string
}

export function useAppVersion() {
  return useQuery({
    queryKey: ['app-version'],
    queryFn: async (): Promise<AppVersionInfo> => {
      try {
        const [version, release, toolhiveVersion] = await Promise.allSettled([
          window.electronAPI.getAppVersion(),
          window.electronAPI.isOfficialReleaseBuild(),
          window.electronAPI.getToolhiveVersion(),
        ])

        return {
          appVersion: version.status === 'fulfilled' ? version.value : 'N/A',
          isReleaseBuild:
            release.status === 'fulfilled' ? release.value : false,
          toolhiveVersion:
            toolhiveVersion.status === 'fulfilled'
              ? toolhiveVersion.value
              : 'N/A',
        }
      } catch (error) {
        toast.error('Failed to fetch version info')
        log.error('Failed to fetch version info:', error)
        throw error
      }
    },
    refetchOnMount: true,
  })
}
