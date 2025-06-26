import { AlertCircle } from 'lucide-react'
import { BaseErrorScreen } from './base-error-screen'
import { KeyringError } from './keyring-error'

interface ErrorProps {
  error?: Error
}

export function Error({ error }: ErrorProps = {}) {
  if (
    error?.toString().includes('OS keyring is not available') &&
    window.electronAPI.isLinux
  ) {
    // this is handled here, because this error could be generated anywhere
    // but only show keyring error on Linux systems
    return <KeyringError />
  }

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
    </BaseErrorScreen>
  )
}
