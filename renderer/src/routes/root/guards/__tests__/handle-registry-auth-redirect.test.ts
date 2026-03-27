import { QueryClient } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { handleRegistryAuthRedirect } from '../handle-registry-auth-redirect'
import type { ToolhiveStatus } from '@common/types/toolhive-status'
import {
  REGISTRY_AUTH_TOAST_ID,
  REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE,
} from '@/common/components/settings/registry/registry-errors-message'

describe('handleRegistryAuthRedirect', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const statusWithAuthError: ToolhiveStatus = {
    isRunning: false,
    processError: 'registry-auth-required',
  }

  const healthyStatus: ToolhiveStatus = {
    isRunning: true,
  }

  it('redirects to /settings with toast on registry-auth-required', async () => {
    window.electronAPI.getToolhiveStatus = vi
      .fn()
      .mockResolvedValue(statusWithAuthError)

    await expect(
      handleRegistryAuthRedirect(queryClient, '/')
    ).rejects.toMatchObject({
      options: { to: '/settings', search: { tab: 'registry' } },
    })

    expect(toast.error).toHaveBeenCalledWith(
      REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE,
      {
        id: REGISTRY_AUTH_TOAST_ID,
        duration: Infinity,
        dismissible: true,
      }
    )
  })

  it('does not redirect when already on /settings', async () => {
    window.electronAPI.getToolhiveStatus = vi
      .fn()
      .mockResolvedValue(statusWithAuthError)

    const result = await handleRegistryAuthRedirect(queryClient, '/settings')

    expect(result).toEqual(statusWithAuthError)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('does not redirect when already notified', async () => {
    window.electronAPI.getToolhiveStatus = vi
      .fn()
      .mockResolvedValue(statusWithAuthError)

    queryClient.setQueryData(['registry-auth-redirected'], true)

    const result = await handleRegistryAuthRedirect(queryClient, '/')

    expect(result).toEqual(statusWithAuthError)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('returns status without redirect when no auth error', async () => {
    window.electronAPI.getToolhiveStatus = vi
      .fn()
      .mockResolvedValue(healthyStatus)

    const result = await handleRegistryAuthRedirect(queryClient, '/')

    expect(result).toEqual(healthyStatus)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('marks as notified in query client after redirect', async () => {
    window.electronAPI.getToolhiveStatus = vi
      .fn()
      .mockResolvedValue(statusWithAuthError)

    await handleRegistryAuthRedirect(queryClient, '/').catch(() => {})

    const notified = queryClient.getQueryData(['registry-auth-redirected'])
    expect(notified).toBe(true)
  })
})
