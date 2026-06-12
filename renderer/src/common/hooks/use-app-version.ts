import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import log from 'electron-log/renderer'

export interface AppVersionInfo {
  currentVersion: string
  latestVersion: string
  isNewVersionAvailable: boolean
  isReleaseBuild: boolean
  toolhiveVersion: string
}

export function useAppVersion() {
  return useQuery({
    queryKey: ['app-version'],
    queryFn: async (): Promise<AppVersionInfo> => {
      try {
        const [version, release, cliStatus] = await Promise.allSettled([
          window.electronAPI.getAppVersion(),
          window.electronAPI.isOfficialReleaseBuild(),
          window.electronAPI.cliAlignment.getStatus(),
        ])

        return {
          currentVersion:
            version.status === 'fulfilled'
              ? version?.value?.currentVersion
              : 'N/A',
          latestVersion:
            version.status === 'fulfilled'
              ? version?.value?.latestVersion
              : 'N/A',
          isNewVersionAvailable:
            version.status === 'fulfilled'
              ? version?.value?.isNewVersionAvailable
              : false,
          isReleaseBuild:
            release.status === 'fulfilled' ? release.value : false,
          // Same value the CLI tab shows (detected from the actual binary),
          // so the two settings tabs can never disagree.
          toolhiveVersion:
            cliStatus.status === 'fulfilled'
              ? (cliStatus.value.cliVersion ?? 'Unknown')
              : 'Unknown',
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

type UpdateState =
  | 'checking'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'not-available'
  | 'none'

export function useCurrentUpdateState() {
  return useQuery({
    queryKey: ['update-state'],
    queryFn: async (): Promise<UpdateState> => {
      try {
        const state = await window.electronAPI.getUpdateState()
        return state
      } catch (error) {
        log.error('Failed to fetch update state:', error)
        return 'none'
      }
    },
    refetchInterval: (query) => {
      const state = query.state.data
      // Stop polling when state is 'downloaded'
      return state === 'downloaded' ? false : 300
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}
