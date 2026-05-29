import { AlertCircle } from 'lucide-react'
import { LinkErrorDiscord } from '../workloads/link-error-discord'
import { BaseErrorScreen } from './base-error-screen'
import { TechnicalDetails } from './technical-details'
import { APP_DISPLAY_NAME } from '@common/app-info'

interface GenericErrorProps {
  error?: Error
}

export function GenericError({ error }: GenericErrorProps) {
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
        If issues persist, contact the {APP_DISPLAY_NAME} team via{' '}
        <LinkErrorDiscord />
      </p>
      {error && (
        <div className="-mt-2 pb-4">
          <TechnicalDetails error={error} />
        </div>
      )}
    </BaseErrorScreen>
  )
}
