import { AlertCircle, RefreshCw, Settings } from 'lucide-react'
import { LinkErrorDiscord } from '../workloads/link-error-discord'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card'
import { useNavigate, Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  getApiV1BetaRegistryByNameServersOptions,
  getApiV1BetaRegistryByNameOptions,
} from '@api/@tanstack/react-query.gen'

const DEFAULT_REGISTRY_NAME = 'default'

export function RegistryError() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleTryAgain = async () => {
    // Invalidate and refetch registry queries
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaRegistryByNameServersOptions({
          path: { name: DEFAULT_REGISTRY_NAME },
        }).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: getApiV1BetaRegistryByNameOptions({
          path: { name: DEFAULT_REGISTRY_NAME },
        }).queryKey,
      }),
    ])

    // Reload the route to trigger the loader again
    await navigate({ to: '/registry', replace: true })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center">
        <h1 className="text-3xl font-bold">Registry</h1>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Card className="flex w-full max-w-md flex-col">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <AlertCircle className="text-destructive size-12" />
            </div>
          </CardHeader>

          <CardContent
            className="text-muted-foreground min-h-0 flex-1 space-y-4
              overflow-y-auto px-8"
          >
            <p>
              We're sorry, but something went wrong while loading the registry.
              Please check your registry settings or try again.
            </p>
            <p>
              If issues persist, contact the ToolHive team via{' '}
              <LinkErrorDiscord />
            </p>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button onClick={handleTryAgain} className="w-full">
              <RefreshCw className="mr-2 size-4" />
              Try Again
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link
                to="/settings"
                search={{ tab: 'registry' }}
                viewTransition={{ types: ['slide-left'] }}
              >
                <Settings className="mr-2 size-4" />
                Registry Settings
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
