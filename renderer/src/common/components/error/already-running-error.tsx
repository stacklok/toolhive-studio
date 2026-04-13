import { AlertCircle } from 'lucide-react'
import { BaseErrorScreen } from './base-error-screen'

export function AlreadyRunningError() {
  return (
    <BaseErrorScreen
      title="ToolHive Is Already Running"
      icon={<AlertCircle className="text-destructive size-12" />}
    >
      <p>
        Another ToolHive HTTP server (
        <code className="bg-background rounded px-1 py-0.5">thv serve</code>) is
        already running on this machine. Only one instance can run at a time.
      </p>
      <p>Please close the other ToolHive instance and click "Try Again".</p>
    </BaseErrorScreen>
  )
}
