import { AlertCircle } from 'lucide-react'
import { LinkErrorDiscord } from '../workloads/link-error-discord'
import { BaseErrorScreen } from './base-error-screen'

export function GenericError() {
  return (
    <BaseErrorScreen
      title="Oops, something went wrong"
      icon={<AlertCircle className="text-destructive size-12" />}
    >
      <p>
        We're sorry, but something unexpected happened. Please try reloading the
        app.
      </p>
      <p>
        If issues persist, contact the ToolHive team via <LinkErrorDiscord />
      </p>
    </BaseErrorScreen>
  )
}
