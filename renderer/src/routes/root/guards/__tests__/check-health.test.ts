import { QueryClient } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Sentry from '@sentry/electron/renderer'
import { checkHealth } from '../check-health'
import type { ToolhiveStatus } from '@common/types/toolhive-status'

vi.mock('@sentry/electron/renderer', () => ({
  captureException: vi.fn(),
}))

vi.mock('@common/api/generated/sdk.gen', () => ({
  getHealth: vi.fn(),
}))

vi.mock('@common/api/generated/client.gen', () => {
  const getConfig = vi.fn().mockReturnValue({ baseUrl: 'https://foo.bar.com' })
  return { client: { getConfig } }
})

const { getHealth } = await import('@common/api/generated/sdk.gen')
const { client } = await import('@common/api/generated/client.gen')

function mockToolhiveStatus(status: ToolhiveStatus) {
  window.electronAPI.getToolhiveStatus = vi.fn().mockResolvedValue(status)
}

describe('checkHealth', () => {
  let queryClient: QueryClient

  const runningStatus: ToolhiveStatus = { isRunning: true }
  const stoppedStatus: ToolhiveStatus = { isRunning: false }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    mockToolhiveStatus(runningStatus)
    window.electronAPI.checkContainerEngine = vi.fn().mockResolvedValue({
      available: true,
      docker: true,
      podman: false,
      rancherDesktop: false,
    })
  })

  it('resolves when health check succeeds', async () => {
    vi.mocked(getHealth).mockResolvedValue(null as never)

    await expect(checkHealth(queryClient)).resolves.toBeUndefined()
  })

  it('throws with structured cause when health check fails', async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error('fetch failed'))

    try {
      await checkHealth(queryClient)
      expect.fail('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('Health check failed')
      expect((error as Error).cause).toEqual({
        isToolhiveRunning: true,
        containerEngineAvailable: true,
        processError: undefined,
      })
    }
  })

  it('reports to Sentry when toolhive is not running', async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error('fetch failed'))
    mockToolhiveStatus(stoppedStatus)

    await checkHealth(queryClient).catch(() => {})

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        level: 'error',
        tags: { component: 'root-route', phase: 'beforeLoad' },
      })
    )
  })

  it('reports to Sentry when container engine is unavailable', async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error('fetch failed'))
    window.electronAPI.checkContainerEngine = vi.fn().mockResolvedValue({
      available: false,
      docker: false,
      podman: false,
      rancherDesktop: false,
    })

    await checkHealth(queryClient).catch(() => {})

    expect(Sentry.captureException).toHaveBeenCalled()
  })

  it('reports to Sentry when client baseUrl is missing', async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error('fetch failed'))
    vi.mocked(client.getConfig).mockReturnValue({ baseUrl: '' })

    await checkHealth(queryClient).catch(() => {})

    expect(Sentry.captureException).toHaveBeenCalled()
  })

  it('does not report to Sentry when infra is healthy', async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error('fetch failed'))
    vi.mocked(client.getConfig).mockReturnValue({
      baseUrl: 'https://foo.bar.com',
    })

    await checkHealth(queryClient).catch(() => {})

    expect(Sentry.captureException).not.toHaveBeenCalled()
  })
})
