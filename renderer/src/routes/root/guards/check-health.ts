import type { QueryClient } from '@tanstack/react-query'
import type { ToolhiveStatus } from '@common/types/toolhive-status'
import { getHealth } from '@common/api/generated/sdk.gen'
import { client } from '@common/api/generated/client.gen'
import * as Sentry from '@sentry/electron/renderer'
import log from 'electron-log/renderer'

/**
 * Calls GET /health to verify the backend API is responsive.
 * On failure, collects diagnostic context (container engine status, client
 * config, process state) and reports to Sentry when the failure is caused by
 * infrastructure issues (ToolHive not running, container engine unavailable,
 * or missing client base URL).
 * Always throws a descriptive Error with a structured cause so the root
 * errorComponent can render the appropriate fallback (StartingToolHive or
 * generic error).
 */
export async function checkHealth(
  queryClient: QueryClient,
  toolhiveStatus: ToolhiveStatus
): Promise<void> {
  try {
    await queryClient.ensureQueryData({
      queryKey: ['health'],
      queryFn: () => getHealth({ throwOnError: true }),
      retry: 2,
      retryDelay: 200,
      staleTime: 0,
      gcTime: 0,
    })
  } catch (error) {
    const containerEngineStatus =
      await window.electronAPI.checkContainerEngine()
    const clientConfig = client.getConfig()

    log.error(
      `[beforeLoad] Client baseUrl: ${clientConfig.baseUrl || 'NOT SET'}`
    )
    log.error(
      `[beforeLoad] ToolHive status: running=${toolhiveStatus.isRunning}, processError=${toolhiveStatus.processError ?? 'none'}`
    )

    reportToSentryIfInfraFailure(
      error,
      toolhiveStatus,
      containerEngineStatus,
      clientConfig
    )

    throw new Error('Health check failed', {
      cause: {
        isToolhiveRunning: toolhiveStatus.isRunning,
        containerEngineAvailable: containerEngineStatus.available,
        processError: toolhiveStatus.processError,
      },
    })
  }
}

function reportToSentryIfInfraFailure(
  error: unknown,
  toolhiveStatus: ToolhiveStatus,
  containerEngineStatus: { available: boolean },
  clientConfig: { baseUrl?: string }
) {
  const isInfraFailure =
    !toolhiveStatus.isRunning ||
    !containerEngineStatus.available ||
    !clientConfig.baseUrl

  if (!isInfraFailure) return

  Sentry.captureException(error, {
    level: 'error',
    tags: {
      component: 'root-route',
      phase: 'beforeLoad',
    },
    extra: {
      toolhive_running: `${toolhiveStatus.isRunning}`,
      toolhive_process_error: toolhiveStatus.processError,
      client_base_url: clientConfig.baseUrl,
      client_configured: `${!!clientConfig.baseUrl}`,
      container_engine: {
        available: `${containerEngineStatus.available}`,
      },
      error_message:
        error instanceof Error ? error.message : JSON.stringify(error),
    },
    fingerprint: [
      'toolhive-not-running',
      'container-engine-not-available',
      'client-base-url-not-set',
      toolhiveStatus.isRunning ? 'process-running' : 'process-not-running',
    ],
  })
}
