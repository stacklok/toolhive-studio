export type ToolhiveProcessError =
  | 'registry-auth-required'
  | 'registry-unavailable'

export interface ToolhiveStatus {
  isRunning: boolean
  processError?: ToolhiveProcessError
}
