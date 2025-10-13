import { AlertCircle } from 'lucide-react'
import { LinkErrorDiscord } from '../workloads/link-error-discord'
import { BaseErrorScreen } from './base-error-screen'

export function GenericError({ error }: { error: Error }) {
  return (
    <BaseErrorScreen
      title="Oops, something went wrong"
      icon={<AlertCircle className="text-destructive size-12" />}
    >
      <p>
        We're sorry, but something unexpected happened. Please try reloading the
        app.
      </p>
      {error?.message && (
        <div className="bg-muted rounded-md p-3 text-sm">
          <code>{error.message}</code>
        </div>
      )}
      <p>
        If issues persist, contact the ToolHive team via <LinkErrorDiscord />
      </p>
    </BaseErrorScreen>
  )
}
