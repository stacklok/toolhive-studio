import type { QueryClient } from '@tanstack/react-query'
import type { ToolhiveStatus } from '@common/types/toolhive-status'
import { redirect } from '@tanstack/react-router'
import { toast } from 'sonner'
import log from 'electron-log/renderer'
import {
  REGISTRY_AUTH_TOAST_ID,
  REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE,
} from '@/common/components/settings/registry/registry-errors-message'

const REGISTRY_AUTH_REDIRECTED_KEY = ['registry-auth-redirected']

/**
 * Fetches the ToolHive process status and checks whether the backend exited
 * because the configured registry requires OAuth authentication.
 * On first detection (not already notified, not already on /settings), shows
 * a persistent error toast and redirects to Settings > Registry so the user
 * can provide credentials or reset.
 * Always returns the ToolhiveStatus for downstream guards (e.g. checkHealth).
 */
export async function handleRegistryAuthRedirect(
  queryClient: QueryClient,
  pathname: string
): Promise<ToolhiveStatus> {
  const toolhiveStatus = await window.electronAPI.getToolhiveStatus()

  const alreadyNotified = queryClient.getQueryData<boolean>(
    REGISTRY_AUTH_REDIRECTED_KEY
  )

  if (
    toolhiveStatus.processError === 'registry-auth-required' &&
    !alreadyNotified &&
    pathname !== '/settings'
  ) {
    queryClient.setQueryData(REGISTRY_AUTH_REDIRECTED_KEY, true)
    log.info('[beforeLoad] Registry auth required, redirecting to settings')
    toast.error(REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE, {
      id: REGISTRY_AUTH_TOAST_ID,
      duration: Infinity,
      dismissible: true,
    })
    throw redirect({ to: '/settings', search: { tab: 'registry' } })
  }

  return toolhiveStatus
}
