import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { RefreshCw, AlertCircle, FolderKey } from 'lucide-react'

interface ErrorProps {
  error?: Error
}

function KeyringError({ error }: ErrorProps) {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <FolderKey className="text-destructive size-12" />
          </div>
          <CardTitle className="text-xl font-semibold">
            OS Keyring Not Available
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            The encrypted provider requires an OS keyring to securely store
            passwords. Please use a different secrets provider (e.g., 1password)
            or ensure your system has a keyring service available.
          </p>
          {error?.message && (
            <div className="text-muted-foreground bg-muted rounded-md p-3 text-sm">
              <code>{error.message}</code>
            </div>
          )}
          <Button onClick={handleReload} className="w-full">
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function Error({ error }: ErrorProps = {}) {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  // Check if this is the OS keyring error
  const isKeyringError = error
    ?.toString()
    .includes('OS keyring is not available')

  // Render the specific keyring error component if it's a keyring error
  if (isKeyringError) {
    return <KeyringError error={error} />
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <AlertCircle className="text-destructive size-12" />
          </div>
          <CardTitle className="text-xl font-semibold">
            Oops, something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            We're sorry, but something unexpected happened. Please try reloading
            the app.
          </p>
          {error?.message && (
            <div className="text-muted-foreground bg-muted rounded-md p-3 text-sm">
              <code>{error.message}</code>
            </div>
          )}
          <Button onClick={handleReload} className="w-full">
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
