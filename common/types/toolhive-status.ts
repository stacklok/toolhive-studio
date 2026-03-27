export type ToolhiveProcessError = 'registry-auth-required'

export interface ToolhiveStatus {
  isRunning: boolean
  processError?: ToolhiveProcessError
}
