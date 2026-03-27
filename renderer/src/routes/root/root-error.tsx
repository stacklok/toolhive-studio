import { Error as ErrorComponent } from '@/common/components/error'
import { StartingToolHive } from '@/common/components/starting-toolhive'
import log from 'electron-log/renderer'

/**
 * Root-level error boundary for the application.
 * Shows StartingToolHive when the health check fails but ToolHive is running
 * and the container engine is available (server still starting up).
 * Falls back to the generic error page for all other errors.
 */
export function RootErrorComponent({ error }: { error: unknown }) {
  const errorData = error as Error & {
    cause?: { containerEngineAvailable?: boolean }
  }
  const cause = errorData instanceof Error ? errorData.cause : undefined

  if (
    cause &&
    typeof cause === 'object' &&
    'isToolhiveRunning' in cause &&
    'containerEngineAvailable' in cause &&
    cause.isToolhiveRunning &&
    cause.containerEngineAvailable
  ) {
    log.info(`[HealthCheckError] Server not ready`)
    return <StartingToolHive />
  }

  log.error(`[ErrorComponent] Error occurred`, errorData)
  return <ErrorComponent error={errorData} />
}
