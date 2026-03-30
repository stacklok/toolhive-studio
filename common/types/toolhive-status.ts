export const REGISTRY_AUTH_REQUIRED = 'registry-auth-required' as const

export type ToolhiveProcessError = typeof REGISTRY_AUTH_REQUIRED

export interface ToolhiveStatus {
  isRunning: boolean
  processError?: ToolhiveProcessError
}
