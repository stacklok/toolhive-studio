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
        Most operating systems have a system keyring out of the box.
      </p>

      <p className="mb-2 font-medium">On Windows</p>
      <div className="text-muted-foreground bg-muted rounded-md p-3 text-left text-sm">
        <p>This error likely indicates a problem with your operating system.</p>
      </div>

      <p className="mb-2 font-medium">On Mac OS</p>
      <div className="text-muted-foreground bg-muted rounded-md p-3 text-left text-sm">
        <p>This error likely indicates a problem with your operating system.</p>
      </div>

      <p className="mb-2 font-medium">On Linux</p>
      <div className="text-muted-foreground bg-muted rounded-md p-3 text-left text-sm">
        <p className="mb-2">
          On most popular distributions, like Ubuntu and Fedora, this likely
          indicates a problem with your operating system.
        </p>

        <p className="mb-2">On other distributions, make sure that:</p>
        <ul className="ml-2 list-inside list-disc space-y-1">
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
      </div>
    </BaseErrorScreen>
  )
}
