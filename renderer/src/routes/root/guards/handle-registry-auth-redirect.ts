import type { QueryClient } from '@tanstack/react-query'
import {
  REGISTRY_AUTH_REQUIRED,
  type ToolhiveStatus,
} from '@common/types/toolhive-status'
import { redirect } from '@tanstack/react-router'
import { toast } from 'sonner'
import log from 'electron-log/renderer'
import { getApiV1BetaRegistry } from '@common/api/generated/sdk.gen'
import {
  getRegistryErrorToastMessage,
  REGISTRY_AUTH_TOAST_ID,
  REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE,
} from '@/common/components/settings/registry/registry-errors-message'

const REGISTRY_AUTH_REDIRECTED_KEY = ['registry-auth-redirected']

function shouldRedirect(queryClient: QueryClient, pathname: string): boolean {
  if (pathname === '/settings') return false
  return !queryClient.getQueryData<boolean>(REGISTRY_AUTH_REDIRECTED_KEY)
}

function performRedirect(queryClient: QueryClient, message: string): never {
  queryClient.setQueryData(REGISTRY_AUTH_REDIRECTED_KEY, true)
  log.info('[beforeLoad] Registry misconfigured, redirecting to settings')
  toast.error(message, {
    id: REGISTRY_AUTH_TOAST_ID,
    duration: Infinity,
    dismissible: true,
  })
  throw redirect({ to: '/settings', search: { tab: 'registry' } })
}

/**
 * Checks whether the configured registry is misconfigured (auth required or
 * unreachable).
 *
 * Two detection paths (first match wins):
 * 1. Process-level: thv wrote "registry authentication required" to stderr
 *    before the HTTP server was ready (caught by toolhive-manager).
 * 2. API-level: GET /api/v1beta/registry returns 503 with
 *    code "registry_auth_required" or "registry_unavailable".
 *
 * On first detection (not already notified, not already on /settings), shows
 * a persistent error toast and redirects to Settings > Registry.
 */
export async function handleRegistryAuthRedirect(
  queryClient: QueryClient,
  pathname: string
): Promise<ToolhiveStatus> {
  const toolhiveStatus = await window.electronAPI.getToolhiveStatus()

  if (
    toolhiveStatus.processError === REGISTRY_AUTH_REQUIRED &&
    shouldRedirect(queryClient, pathname)
  ) {
    performRedirect(queryClient, REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE)
  }

  try {
    await getApiV1BetaRegistry({ throwOnError: true })
  } catch (error) {
    const toastMessage = getRegistryErrorToastMessage(error)
    if (toastMessage && shouldRedirect(queryClient, pathname)) {
      performRedirect(queryClient, toastMessage)
    }
  }

  return toolhiveStatus
}
