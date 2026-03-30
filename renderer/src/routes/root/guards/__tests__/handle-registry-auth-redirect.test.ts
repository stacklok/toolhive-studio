import { QueryClient } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  REGISTRY_AUTH_REQUIRED,
  type ToolhiveStatus,
} from '@common/types/toolhive-status'
import {
  REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE,
  REGISTRY_UNAVAILABLE_TOAST_MESSAGE,
} from '@/common/components/settings/registry/registry-errors-message'

vi.mock('@common/api/generated/sdk.gen', () => ({
  getApiV1BetaRegistry: vi.fn(),
}))

const { getApiV1BetaRegistry } = await import('@common/api/generated/sdk.gen')
const mockGetRegistry = vi.mocked(getApiV1BetaRegistry)

const { handleRegistryAuthRedirect, REGISTRY_PENDING_TOAST_KEY } =
  await import('../handle-registry-auth-redirect')

const REDIRECT_MATCH = {
  options: { to: '/settings', search: { tab: 'registry' } },
}

describe('handleRegistryAuthRedirect', () => {
  let queryClient: QueryClient

  const statusWithAuthError: ToolhiveStatus = {
    isRunning: false,
    processError: REGISTRY_AUTH_REQUIRED,
  }

  const healthyStatus: ToolhiveStatus = { isRunning: true }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    mockGetRegistry.mockResolvedValue({} as never)
  })

  describe('process-level detection (stderr)', () => {
    it('redirects and stores pending toast message', async () => {
      window.electronAPI.getToolhiveStatus = vi
        .fn()
        .mockResolvedValue(statusWithAuthError)

      await expect(
        handleRegistryAuthRedirect(queryClient, '/')
      ).rejects.toMatchObject(REDIRECT_MATCH)

      expect(queryClient.getQueryData(REGISTRY_PENDING_TOAST_KEY)).toBe(
        REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE
      )
    })

    it('does not redirect when already on /settings', async () => {
      window.electronAPI.getToolhiveStatus = vi
        .fn()
        .mockResolvedValue(statusWithAuthError)

      const result = await handleRegistryAuthRedirect(queryClient, '/settings')

      expect(result).toEqual(statusWithAuthError)
      expect(
        queryClient.getQueryData(REGISTRY_PENDING_TOAST_KEY)
      ).toBeUndefined()
    })

    it('does not redirect when already notified', async () => {
      window.electronAPI.getToolhiveStatus = vi
        .fn()
        .mockResolvedValue(statusWithAuthError)

      queryClient.setQueryData(['registry-auth-redirected'], true)

      const result = await handleRegistryAuthRedirect(queryClient, '/')

      expect(result).toEqual(statusWithAuthError)
      expect(
        queryClient.getQueryData(REGISTRY_PENDING_TOAST_KEY)
      ).toBeUndefined()
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

  describe('API-level detection (GET /registry)', () => {
    beforeEach(() => {
      window.electronAPI.getToolhiveStatus = vi
        .fn()
        .mockResolvedValue(healthyStatus)
    })

    it('redirects when GET /registry returns registry_auth_required', async () => {
      mockGetRegistry.mockRejectedValue({ code: 'registry_auth_required' })

      await expect(
        handleRegistryAuthRedirect(queryClient, '/')
      ).rejects.toMatchObject(REDIRECT_MATCH)

      expect(queryClient.getQueryData(REGISTRY_PENDING_TOAST_KEY)).toBe(
        REGISTRY_AUTH_REQUIRED_TOAST_MESSAGE
      )
    })

    it('does not redirect when already on /settings', async () => {
      mockGetRegistry.mockRejectedValue({ code: 'registry_auth_required' })

      const result = await handleRegistryAuthRedirect(queryClient, '/settings')

      expect(result).toEqual(healthyStatus)
      expect(
        queryClient.getQueryData(REGISTRY_PENDING_TOAST_KEY)
      ).toBeUndefined()
    })

    it('does not redirect when already notified', async () => {
      mockGetRegistry.mockRejectedValue({ code: 'registry_auth_required' })
      queryClient.setQueryData(['registry-auth-redirected'], true)

      const result = await handleRegistryAuthRedirect(queryClient, '/')

      expect(result).toEqual(healthyStatus)
      expect(
        queryClient.getQueryData(REGISTRY_PENDING_TOAST_KEY)
      ).toBeUndefined()
    })

    it('redirects when GET /registry returns registry_unavailable', async () => {
      mockGetRegistry.mockRejectedValue({ code: 'registry_unavailable' })

      await expect(
        handleRegistryAuthRedirect(queryClient, '/')
      ).rejects.toMatchObject(REDIRECT_MATCH)

      expect(queryClient.getQueryData(REGISTRY_PENDING_TOAST_KEY)).toBe(
        REGISTRY_UNAVAILABLE_TOAST_MESSAGE
      )
    })

    it('does not redirect for unknown registry errors', async () => {
      mockGetRegistry.mockRejectedValue({ code: 'some_other_error' })

      const result = await handleRegistryAuthRedirect(queryClient, '/')

      expect(result).toEqual(healthyStatus)
      expect(
        queryClient.getQueryData(REGISTRY_PENDING_TOAST_KEY)
      ).toBeUndefined()
    })
  })

  it('returns status without redirect when no auth error', async () => {
    window.electronAPI.getToolhiveStatus = vi
      .fn()
      .mockResolvedValue(healthyStatus)

    const result = await handleRegistryAuthRedirect(queryClient, '/')

    expect(result).toEqual(healthyStatus)
    expect(queryClient.getQueryData(REGISTRY_PENDING_TOAST_KEY)).toBeUndefined()
  })
})
