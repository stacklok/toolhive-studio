import { IllustrationPackage } from '../illustrations/illustration-package'
import { Button } from '../ui/button'
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BaseErrorScreen } from './base-error-screen'

// Helper function to ensure minimum display time
const withMinimumDelay = async (
  action: () => Promise<void>,
  minTime: number
) => {
  const startTime = Date.now()
  await action()
  const elapsedTime = Date.now() - startTime
  const remainingTime = Math.max(0, minTime - elapsedTime)
  if (remainingTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingTime))
  }
}

export function ConnectionRefusedError() {
  const [isChecking, setIsChecking] = useState(true)
  const [showGenericError, setShowGenericError] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)

  const handleRestart = async () => {
    console.log('Container engines are now available, restarting ToolHive...')
    setIsRestarting(true)

    await withMinimumDelay(async () => {
      try {
        const restartResult = await window.electronAPI.restartToolhive()

        if (restartResult.success) {
          console.log('ToolHive restarted successfully')
          window.location.reload()
        } else {
          console.error('Failed to restart ToolHive:', restartResult.error)
          setIsRestarting(false)
          setShowGenericError(true)
        }
      } catch (restartError) {
        console.error('Error restarting ToolHive:', restartError)
        setIsRestarting(false)
        setShowGenericError(true)
      }
    }, 1200)
  }

  useEffect(() => {
    const checkEngines = async () => {
      setIsChecking(true)

      await withMinimumDelay(async () => {
        try {
          const status = await window.electronAPI.checkContainerEngine()

          if (status.available) {
            await handleRestart()
          }
        } catch (error) {
          console.error('Failed to check container engines:', error)
        }
      }, 800)

      setIsChecking(false)
    }
    checkEngines()
  }, [])

  // If engines are available, show generic error
  if (showGenericError) {
    return (
      <BaseErrorScreen
        title="Connection Refused"
        icon={<AlertCircle className="text-destructive size-12" />}
      >
        <p>
          We're having trouble connecting to ToolHive. This is unexpected and
          may indicate a service issue.
        </p>
      </BaseErrorScreen>
    )
  }

  const handleOpenDockerDocs = () => {
    window.open('https://docs.docker.com/get-docker/', '_blank')
  }

  const handleOpenPodmanDocs = () => {
    window.open('https://podman.io/getting-started/installation', '_blank')
  }

  if (isChecking || isRestarting) {
    return (
      <BaseErrorScreen
        title="Connection Refused"
        icon={<IllustrationPackage className="size-20" />}
      >
        <div className="py-4 text-center">
          <RefreshCw className="mx-auto mb-2 size-6 animate-spin" />
          <p>
            {isRestarting
              ? 'Restarting ToolHive...'
              : 'Checking container engines...'}
          </p>
        </div>
      </BaseErrorScreen>
    )
  }

  return (
    <BaseErrorScreen
      title="Connection Refused"
      icon={<IllustrationPackage className="size-20" />}
    >
      <p>
        ToolHive Studio requires either <strong>Docker</strong> or{' '}
        <strong>Podman</strong> to be installed and running to manage
        containerized tools and services.
      </p>

      <div className="bg-muted rounded-md p-3 text-sm">
        <p className="mb-2 font-medium">To get started:</p>
        <ol className="list-inside list-decimal space-y-1">
          <li>Install Docker Desktop or Podman</li>
          <li>Start the container engine</li>
          <li>Click "Check Again" to continue</li>
        </ol>
      </div>

      <div className="space-y-2 pb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenDockerDocs}
          className="w-full justify-start"
        >
          <ExternalLink className="mr-2 size-4" />
          Install Docker Desktop
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenPodmanDocs}
          className="w-full justify-start"
        >
          <ExternalLink className="mr-2 size-4" />
          Install Podman
        </Button>
      </div>
    </BaseErrorScreen>
  )
}
