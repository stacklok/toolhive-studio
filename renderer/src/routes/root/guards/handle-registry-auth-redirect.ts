import type { QueryClient } from '@tanstack/react-query'
import type { ToolhiveStatus } from '@common/types/toolhive-status'
import { redirect } from '@tanstack/react-router'
import { toast } from 'sonner'
import log from 'electron-log/renderer'
import {
  REGISTRY_AUTH_TOAST_ID,
  REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE,
  REGISTRY_UNAVAILABLE_TOAST_MESSAGE,
} from '@/common/components/settings/registry/registry-errors-message'

const REGISTRY_REDIRECTED_KEY = ['registry-auth-redirected']

const TOAST_MESSAGE_BY_ERROR = {
  'registry-auth-required': REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE,
  'registry-unavailable': REGISTRY_UNAVAILABLE_TOAST_MESSAGE,
} as const

/**
 * Fetches the ToolHive process status and checks whether the backend has a
 * registry-level error (auth required, login failed, or upstream unreachable).
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
  const { processError } = toolhiveStatus

  const hasRegistryError =
    processError === 'registry-auth-required' ||
    processError === 'registry-unavailable'

  const alreadyNotified = queryClient.getQueryData<boolean>(
    REGISTRY_REDIRECTED_KEY
  )

  if (hasRegistryError && !alreadyNotified && pathname !== '/settings') {
    queryClient.setQueryData(REGISTRY_REDIRECTED_KEY, true)
    log.info(
      `[beforeLoad] Registry error (${processError}), redirecting to settings`
    )
    toast.error(TOAST_MESSAGE_BY_ERROR[processError], {
      id: REGISTRY_AUTH_TOAST_ID,
      duration: Infinity,
      dismissible: true,
    })
    throw redirect({ to: '/settings', search: { tab: 'registry' } })
  }

  return toolhiveStatus
}
