export type ToolhiveExitReason = 'registry-auth-required'

export interface ToolhiveStatus {
  isRunning: boolean
  exitReason?: ToolhiveExitReason
}
