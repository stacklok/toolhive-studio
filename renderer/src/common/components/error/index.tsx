import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { RefreshCw, AlertCircle, FolderKey } from 'lucide-react'
import type { ReactNode } from 'react'

interface ErrorProps {
  error?: Error
}

interface BaseErrorScreenProps {
  title: string
  icon: ReactNode
  children: ReactNode
}

function BaseErrorScreen({ title, icon, children }: BaseErrorScreenProps) {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">{icon}</div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          <Button onClick={handleReload} className="w-full">
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function KeyringError() {
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

export function Error({ error }: ErrorProps = {}) {
  // Check if this is the OS keyring error
  const isKeyringError = error
    ?.toString()
    .includes('OS keyring is not available')

  // Render the specific keyring error component if it's a keyring error
  if (isKeyringError) {
    return <KeyringError />
  }

  return (
    <BaseErrorScreen
      title="Oops, something went wrong"
      icon={<AlertCircle className="text-destructive size-12" />}
    >
      <p className="text-muted-foreground">
        We're sorry, but something unexpected happened. Please try reloading the
        app.
      </p>
      {error?.message && (
        <div className="text-muted-foreground bg-muted rounded-md p-3 text-sm">
          <code>{error.message}</code>
        </div>
      )}
    </BaseErrorScreen>
  )
}
