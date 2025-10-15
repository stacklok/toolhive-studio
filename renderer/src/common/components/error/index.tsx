import { KeyringError } from './keyring-error'
import { ConnectionRefusedError } from './connection-refused-error'
import { GenericError } from './generic-error'

interface ErrorProps {
  error?: Error & { cause?: { containerEngineAvailable?: boolean } }
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
    error?.message?.includes('failed to ping Docker server') ||
    !error?.cause?.containerEngineAvailable
  ) {
    return <ConnectionRefusedError />
  }

  return <GenericError error={error} />
}
