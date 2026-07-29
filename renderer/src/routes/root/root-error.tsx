import { AlreadyRunningError } from '@/common/components/error/already-running-error'
import { Error as ErrorComponent } from '@/common/components/error'
import { StartingToolHive } from '@/common/components/starting-toolhive'
import { ALREADY_RUNNING } from '@common/types/toolhive-status'
import type { HealthCheckError } from './guards/check-health'
import log from 'electron-log/renderer'

function getHealthCheckMetadata(
  error: unknown
): HealthCheckError['healthCheck'] | undefined {
  if (!(error instanceof Error) || !('healthCheck' in error)) {
    return undefined
  }

  return (error as HealthCheckError).healthCheck
}

/**
 * Root-level error boundary for the application.
 * Shows StartingToolHive when the health check fails but ToolHive is running
 * and the container engine is available (server still starting up).
 * Falls back to the generic error page for all other errors.
 */
export function RootErrorComponent({ error }: { error: unknown }) {
  const errorInstance = error instanceof Error ? error : undefined
  const healthCheck = getHealthCheckMetadata(error)

  if (healthCheck?.processError === ALREADY_RUNNING) {
    // eslint-disable-next-line no-restricted-syntax -- TODO: decide on branding in logs
    log.info('[HealthCheckError] Another ToolHive server is already running')
    return <AlreadyRunningError />
  }

  if (healthCheck?.isToolhiveRunning && healthCheck.containerEngineAvailable) {
    log.info(`[HealthCheckError] Server not ready`)
    return <StartingToolHive />
  }

  log.error(`[ErrorComponent] Error occurred`, errorInstance ?? error)
  return <ErrorComponent error={errorInstance} />
}
