import { IllustrationPackage } from '../illustrations/illustration-package'
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
import { BaseErrorScreen } from './base-error-screen'
import type { ReactNode } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { withMinimumDelay } from './utils'

interface ExternalLinkButtonProps {
  href: string
  children: ReactNode
  icon?: ReactNode
}

const ExternalLinkButton = ({ href, children }: ExternalLinkButtonProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="border-input bg-background ring-offset-background hover:bg-accent
      hover:text-accent-foreground focus-visible:ring-ring inline-flex w-full
      items-center justify-between rounded-md border px-3 py-2 text-sm
      transition-colors focus-visible:ring-2 focus-visible:ring-offset-2
      focus-visible:outline-none"
  >
    <span className="flex items-center">
      <ExternalLink className="mr-2 size-4" />
      {children}
    </span>
  </a>
)

export function ConnectionRefusedError() {
  const { data: containerStatus, isLoading: isChecking } = useQuery({
    queryKey: ['container-engines'],
    queryFn: async () => {
      const result = await withMinimumDelay(
        window.electronAPI.checkContainerEngine,
        800
      )
      return result
    },
    retry: false,
    refetchOnWindowFocus: true,
  })

  const {
    isPending: isRestarting,
    mutate: restartToolhive,
    isError: isRestartError,
  } = useMutation({
    mutationFn: async () => {
      console.log('Container engines are now available, restarting ToolHive...')
      const result = await withMinimumDelay(
        window.electronAPI.restartToolhive,
        1200
      )
      return result
    },
    onSuccess: (result) => {
      if (result.success) {
        console.log('ToolHive restarted successfully')
        window.location.reload()
      } else {
        console.error('Failed to restart ToolHive:', result.error)
      }
    },
    onError: (error) => {
      console.error('Error restarting ToolHive:', error)
    },
  })

  useEffect(() => {
    if (containerStatus?.available && !isRestarting) {
      restartToolhive()
    }
  }, [containerStatus?.available, isRestarting, restartToolhive])

  const showGenericError = containerStatus?.available && isRestartError

  // If engine is available, show generic error
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

        <div className="bg-muted rounded-md p-3 text-sm">
          <p className="mb-2 font-medium">Need help?</p>
          <p className="mb-3">
            If this issue persists, our community can help troubleshoot the
            problem.
          </p>

          <ExternalLinkButton href="https://discord.gg/stacklok">
            Join Discord Support
          </ExternalLinkButton>
        </div>
      </BaseErrorScreen>
    )
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
        <ExternalLinkButton href="https://docs.docker.com/get-docker/">
          Install Docker Desktop
        </ExternalLinkButton>

        <ExternalLinkButton href="https://podman.io/getting-started/installation">
          Install Podman
        </ExternalLinkButton>
      </div>
    </BaseErrorScreen>
  )
}
