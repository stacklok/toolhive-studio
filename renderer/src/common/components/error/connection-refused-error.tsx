import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Button } from '@/common/components/ui/button'
import { BaseErrorScreen } from './base-error-screen'
import { IllustrationPackage } from '../illustrations/illustration-package'
import { withMinimumDelay } from './utils'
import log from 'electron-log/renderer'
import { DISCORD_URL, THV_DISPLAY_NAME } from '@common/app-info'

interface ExternalLinkButtonProps {
  href: string
  children: ReactNode
  icon?: ReactNode
}

const ExternalLinkButton = ({ href, children }: ExternalLinkButtonProps) => (
  <Button asChild variant="outline" className="w-full justify-start">
    <a href={href} target="_blank" rel="noopener noreferrer">
      <ExternalLink />
      {children}
    </a>
  </Button>
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
      // eslint-disable-next-line no-restricted-syntax -- TODO: decide on branding in logs
      log.info('Container engines are now available, restarting ToolHive...')
      const result = await withMinimumDelay(
        window.electronAPI.restartToolhive,
        1200
      )
      return result
    },
    onSuccess: (result) => {
      if (result.success) {
        // eslint-disable-next-line no-restricted-syntax -- TODO: decide on branding in logs
        log.info('ToolHive restarted successfully')
        window.location.reload()
      } else {
        // eslint-disable-next-line no-restricted-syntax -- TODO: decide on branding in logs
        log.error('Failed to restart ToolHive: ', result.error)
      }
    },
    onError: (error) => {
      // eslint-disable-next-line no-restricted-syntax -- TODO: decide on branding in logs
      log.error('Error restarting ToolHive: ', error)
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
          We're having trouble connecting to {THV_DISPLAY_NAME}. This is
          unexpected and may indicate a service issue.
        </p>

        <div className="bg-muted rounded-md p-3 text-sm">
          <p className="mb-2 font-medium">Need help?</p>
          <p className="mb-3">
            If this issue persists, our community can help troubleshoot the
            problem.
          </p>

          <ExternalLinkButton href={DISCORD_URL}>
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
              ? `Restarting ${THV_DISPLAY_NAME}...`
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
        {THV_DISPLAY_NAME} requires a container engine to be installed and
        running to manage containerized tools and services. We support{' '}
        <strong>Docker</strong>, <strong>Podman</strong> or{' '}
        <strong>Rancher Desktop</strong> (with dockerd - moby).
      </p>

      <div className="bg-muted rounded-md p-3 text-sm">
        <p className="mb-2 font-medium">To get started:</p>
        <ol className="list-inside list-decimal space-y-1">
          <li>
            Install Docker Desktop, Podman Desktop or Rancher Desktop (with
            dockerd - moby)
          </li>
          <li>Start the container engine</li>
          <li>Click "Try Again" to continue</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-2 pb-4 md:grid-cols-3">
        <ExternalLinkButton href="https://docs.docker.com/get-docker/">
          Docker
        </ExternalLinkButton>

        <ExternalLinkButton href="https://podman-desktop.io/downloads">
          Podman
        </ExternalLinkButton>

        <ExternalLinkButton href="https://rancherdesktop.io/">
          Rancher
        </ExternalLinkButton>
      </div>
    </BaseErrorScreen>
  )
}
