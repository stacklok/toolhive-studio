import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from '@/common/components/ui/dropdown-menu'
import { Button } from '@/common/components/ui/button'
import { MoreVertical } from 'lucide-react'

import type { CoreWorkload } from '@api/types.gen'
import { ActionsMcpServer } from '../actions-mcp-server'
import { useMutationRestartServer } from '../../hooks/use-mutation-restart-server'
import { useMutationStopServerList } from '../../hooks/use-mutation-stop-server'

import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../../utils/feature-flags'
import { getApiV1BetaRegistryByNameServersByServerName } from '@api/sdk.gen'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { trackEvent } from '@/common/lib/analytics'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/common/components/ui/tooltip'

import { AddServerToGroupMenuItem } from './add-server-to-group-menu-item'
import { RemoveServerMenuItem } from './remove-server-menu-item'
import { LogsMenuItem } from './logs-menu-item'
import { GithubRepositoryMenuItem } from './github-repository-menu-item'
import { CustomizeToolsMenuItem } from './customize-tools-menu-item'
import { EditConfigurationMenuItem } from './edit-configuration-menu-item'
import { ServerUrl } from './server-url'

type CardContentMcpServerProps = {
  status: CoreWorkload['status']
  statusContext: CoreWorkload['status_context']
  name: string
  transport: CoreWorkload['transport_type']
}

function CardContentMcpServer({
  name,
  status,
  transport,
}: CardContentMcpServerProps) {
  const isRunning = status === 'running'
  const { mutateAsync: restartMutate, isPending: isRestartPending } =
    useMutationRestartServer({
      name,
    })
  const { mutateAsync: stopMutate, isPending: isStopPending } =
    useMutationStopServerList({
      name,
    })

  return (
    <CardContent>
      <div className="flex flex-col gap-4">
        <div
          className="border-border flex items-center justify-between border-t
            pt-4"
        >
          <ActionsMcpServer
            status={status}
            isPending={isRestartPending || isStopPending}
            mutate={() => {
              if (isRunning) {
                stopMutate({
                  path: {
                    name,
                  },
                })
                return trackEvent(`Workload ${name} stopped`, {
                  workload: name,
                  transport,
                })
              }

              restartMutate({
                path: {
                  name,
                },
              })
              return trackEvent(`Workload ${name} started`, {
                workload: name,
                transport,
              })
            }}
          />
        </div>
      </div>
    </CardContent>
  )
}

export function CardMcpServer({
  name,
  status,
  statusContext,
  url,
  transport,
}: {
  name: string
  status: CoreWorkload['status']
  statusContext: CoreWorkload['status_context']
  url: string
  transport: CoreWorkload['transport_type']
}) {
  const nameRef = useRef<HTMLElement | null>(null)
  const isCustomizeToolsEnabled = useFeatureFlag(
    featureFlagKeys.CUSTOMIZE_TOOLS
  )
  const isGroupsEnabled = useFeatureFlag(featureFlagKeys.GROUPS)
  const isEditWorkloadEnabled = useFeatureFlag(featureFlagKeys.EDIT_WORKLOAD)

  const { data: serverDetails } = useQuery({
    queryKey: ['serverDetails', name],
    queryFn: async () => {
      if (!name) return null
      try {
        const { data } = await getApiV1BetaRegistryByNameServersByServerName({
          path: {
            name: 'default',
            serverName: name,
          },
        })

        return data ?? {}
      } catch (error) {
        console.error(`Failed to fetch details for server ${name}:`, error)
        return null
      }
    },
    enabled: Boolean(name),
  })

  const search = useSearch({
    strict: false,
  })
  const [isNewServer, setIsNewServer] = useState(false)

  useEffect(() => {
    // Check if the server is new by looking for a specific search parameter
    // This could be a query parameter or any other condition that indicates a new server
    if ('newServerName' in search && search.newServerName === name) {
      setIsNewServer(true)
      // clear state after 2 seconds
      setTimeout(() => {
        setIsNewServer(false)
      }, 2000)
    } else {
      setIsNewServer(false)
    }

    return () => {
      setIsNewServer(false)
    }
  }, [name, search])

  const repositoryUrl = serverDetails?.server?.repository_url

  // Check if the server is in deleting state
  const isDeleting = status === 'deleting'
  const isTransitioning =
    status === 'starting' || status === 'stopping' || status === 'restarting'
  const isStopped = status === 'stopped' || status === 'stopping'
  const [hadRecentStatusChange, setHadRecentStatusChange] = useState(false)
  const [prevStatus, setPrevStatus] = useState<CoreWorkload['status']>(status)

  useEffect(() => {
    // show a brief animation for status transitions that are immediate
    if (prevStatus !== status && ['running'].includes(status ?? '')) {
      setHadRecentStatusChange(true)
      const timeout = setTimeout(() => setHadRecentStatusChange(false), 2500)
      return () => clearTimeout(timeout)
    }
    setPrevStatus(status)
  }, [status, prevStatus])

  return (
    <Card
      className={twMerge(
        'transition-all duration-300 ease-in-out',
        isNewServer ? 'ring-2' : undefined,
        isDeleting ? 'pointer-events-none opacity-50' : undefined,
        (isTransitioning || hadRecentStatusChange) && 'animate-diagonal-ring',
        isStopped && 'bg-card/65'
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between overflow-hidden">
          <CardTitle
            className={twMerge(
              'min-w-0 flex-1 text-xl',
              isStopped && 'text-primary/65'
            )}
          >
            <Tooltip onlyWhenTruncated>
              <TooltipTrigger asChild>
                <span ref={nameRef} className="block cursor-default truncate">
                  {name}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{name}</TooltipContent>
            </Tooltip>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="More options"
                className="ml-2"
                onClick={(e) => e.stopPropagation()}
                disabled={isDeleting}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              collisionPadding={10}
              align="end"
              role="menu"
              className="w-80"
            >
              <ServerUrl url={url} />
              <DropdownMenuSeparator />
              {isEditWorkloadEnabled && (
                <EditConfigurationMenuItem serverName={name} />
              )}
              {repositoryUrl && (
                <GithubRepositoryMenuItem repositoryUrl={repositoryUrl} />
              )}
              <LogsMenuItem serverName={name} />
              {isCustomizeToolsEnabled && (
                <CustomizeToolsMenuItem serverName={name} status={status} />
              )}
              <RemoveServerMenuItem serverName={name} />
              {isGroupsEnabled && <DropdownMenuSeparator />}

              <AddServerToGroupMenuItem serverName={name} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContentMcpServer
        status={status}
        statusContext={statusContext}
        name={name}
        transport={transport}
      />
    </Card>
  )
}
