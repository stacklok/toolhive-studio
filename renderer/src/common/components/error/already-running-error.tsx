import { AlertCircle } from 'lucide-react'
import { BaseErrorScreen } from './base-error-screen'
import { THV_DISPLAY_NAME } from '@common/app-info'

export function AlreadyRunningError() {
  return (
    <BaseErrorScreen
      title={`${THV_DISPLAY_NAME} Is Already Running`}
      icon={<AlertCircle className="text-destructive size-12" />}
    >
      <p>
        Another {THV_DISPLAY_NAME} HTTP server (
        <code className="bg-background rounded px-1 py-0.5">thv serve</code>) is
        already running on this machine. Only one instance can run at a time.
      </p>
      <p>
        Please close the other {THV_DISPLAY_NAME} instance and click "Try
        Again".
      </p>
    </BaseErrorScreen>
  )
}
