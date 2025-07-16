import { AlertCircle } from 'lucide-react'
import { BaseErrorScreen } from './base-error-screen'
import { KeyringError } from './keyring-error'
import { ConnectionRefusedError } from './connection-refused-error'

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

  // Check for connection errors that might indicate container engine issues
  if (
    error?.toString().includes('ECONNREFUSED') ||
    error?.toString().includes('Connection refused') ||
    error?.toString().includes('connect ECONNREFUSED') ||
    error?.toString().includes('ENOTFOUND') ||
    error?.toString().includes('Network Error') ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('failed to ping Docker server')
  ) {
    return <ConnectionRefusedError />
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
