import { FolderKey } from 'lucide-react'
import { BaseErrorScreen } from './base-error-screen'

export function KeyringError() {
  return (
    <BaseErrorScreen
      title="System Keyring Cannot be Reached"
      icon={<FolderKey className="text-destructive size-12" />}
    >
      <p className="text-muted-foreground">
        ToolHive Studio needs to access your system keyring in order to securely
        store and manage your secrets.
      </p>

      <p className="text-muted-foreground">
        Most Linux distributions have a system keyring out of the box.
      </p>

      <p className="text-muted-foreground mb-2">
        On other distributions, make sure that:
      </p>
      <ul className="text-muted-foreground ml-2 list-inside list-disc space-y-1">
        <li>You have a keyring daemon installed and running</li>
        <li>You have a default login keyring configured</li>
        <li>
          <span className="font-bold">Your login keyring is unlocked</span>{' '}
          (should be automatically unlocked after logging in)
        </li>
        <li>
          You have rebooted your computer after any changes to your keyring
          configuration
        </li>
      </ul>
    </BaseErrorScreen>
  )
}
