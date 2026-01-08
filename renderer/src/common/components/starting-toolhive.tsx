import { Loader } from 'lucide-react'
import { IllustrationPackage } from './illustrations/illustration-package'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { getHealthOptions } from '@api/@tanstack/react-query.gen'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import log from 'electron-log/renderer'
import { useNavigate } from '@tanstack/react-router'
import { GenericError } from './error/generic-error'

export function StartingToolHive() {
  const navigate = useNavigate()

  const { isLoading: isChecking, error } = useQuery({
    ...getHealthOptions(),
    staleTime: 0,
    gcTime: 0,
    retry: 10,
    retryDelay: 300,
    refetchOnWindowFocus: true,
  })
  const hasError = error && !isChecking

  useEffect(() => {
    if (!error && !isChecking) {
      log.info(
        '[StartingToolHive] Health check successful, navigating to default group'
      )
      navigate({ to: '/group/$groupName', params: { groupName: 'default' } })
    }

    if (hasError) {
      log.error(
        '[StartingToolHive] Error checking health:',
        JSON.stringify(error)
      )
    }
  }, [isChecking, error, navigate, hasError])

  if (hasError) {
    return <GenericError />
  }

  return (
    <div
      className="mt-[64px] flex h-[calc(100vh-5rem-64px)] items-center
        justify-center px-8"
    >
      <Card
        className="mt-10 flex max-h-[min(600px,_100%)] w-full max-w-md flex-col"
      >
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <IllustrationPackage className="size-20" />
          </div>

          <CardTitle className="text-xl font-semibold">
            Starting ToolHive configuration
          </CardTitle>
        </CardHeader>

        <CardContent
          className="text-muted-foreground flex min-h-0 flex-1 flex-col
            items-center justify-center space-y-4 overflow-y-auto px-8"
        >
          <div className="text-muted-foreground text-center">
            We're checking your ToolHive configuration to ensure it's set up
            correctly.
          </div>
          <Loader className="size-10 animate-spin [animation-duration:1.5s]" />
        </CardContent>
      </Card>
    </div>
  )
}
