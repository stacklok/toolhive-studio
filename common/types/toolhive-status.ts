export const REGISTRY_AUTH_REQUIRED = 'registry-auth-required' as const
export const ALREADY_RUNNING = 'already-running' as const

export type ToolhiveProcessError =
  | typeof REGISTRY_AUTH_REQUIRED
  | typeof ALREADY_RUNNING

export interface ToolhiveStatus {
  isRunning: boolean
  processError?: ToolhiveProcessError
}
