import { APP_DISPLAY_NAME, THV_DISPLAY_NAME } from '@common/app-info'

export interface EnvironmentInfo {
  desktopVersion: string
  cliVersion: string
  platform: string
  userAgent: string
  toolhiveRunning: string
  containerEngine: string
}

export const METADATA_FIELDS: {
  label: string
  key: keyof EnvironmentInfo
}[] = [
  { label: 'Desktop', key: 'desktopVersion' },
  { label: 'CLI', key: 'cliVersion' },
  { label: 'Platform', key: 'platform' },
  { label: THV_DISPLAY_NAME, key: 'toolhiveRunning' },
  { label: 'Engine', key: 'containerEngine' },
]

export function buildCrashReport(error: Error, env: EnvironmentInfo): string {
  const timestamp = new Date().toISOString()
  return [
    `${APP_DISPLAY_NAME} Crash Report`,
    '=====================',
    `Timestamp: ${timestamp}`,
    `Desktop Version: ${env.desktopVersion}`,
    `CLI Version: ${env.cliVersion}`,
    `Platform: ${env.platform}`,
    `${THV_DISPLAY_NAME} Running: ${env.toolhiveRunning}`,
    `Container Engine: ${env.containerEngine}`,
    `User Agent: ${env.userAgent}`,
    '',
    error.toString(),
    '',
    'Stack Trace:',
    error.stack ?? '(no stack trace available)',
  ].join('\n')
}

// Helper function to ensure minimum display time
export async function withMinimumDelay<T>(
  action: () => Promise<T>,
  minTime: number
): Promise<T> {
  const startTime = Date.now()
  const result = await action()
  const elapsedTime = Date.now() - startTime
  const remainingTime = Math.max(0, minTime - elapsedTime)
  if (remainingTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingTime))
  }
  return result
}
