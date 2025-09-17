import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'

import type { CoreWorkload } from '@api/types.gen'
import { ActionsMcpServer } from '../actions-mcp-server'
import { useMutationRestartServer } from '../../hooks/use-mutation-restart-server'
import { useMutationStopServerList } from '../../hooks/use-mutation-stop-server'

import { useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { trackEvent } from '@/common/lib/analytics'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/common/components/ui/tooltip'

import { ServerActionsDropdown } from './server-actions'
import { CloudIcon, LaptopIcon } from 'lucide-react'
import { useFeatureFlag } from '@/common/hooks/use-feature-flag'
import { featureFlagKeys } from '../../../../../../utils/feature-flags'

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
  remote,
  transport,
  isInDisabledGroup,
}: {
  name: string
  status: CoreWorkload['status']
  statusContext: CoreWorkload['status_context']
  remote?: CoreWorkload['remote']
  url: string
  transport: CoreWorkload['transport_type']
  isInDisabledGroup?: boolean
}) {
  const isRemoteMcpEnabled = useFeatureFlag(featureFlagKeys.REMOTE_MCP)
  const nameRef = useRef<HTMLElement | null>(null)

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
      data-is-in-disabled-group={isInDisabledGroup ? 'true' : undefined}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-6 overflow-hidden">
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
          <div className="flex items-center gap-1">
            {isRemoteMcpEnabled && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {remote ? (
                    <CloudIcon className="size-5" />
                  ) : (
                    <LaptopIcon className="size-5" />
                  )}
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {remote ? 'Remote MCP server' : 'Local MCP server'}
                </TooltipContent>
              </Tooltip>
            )}
            <ServerActionsDropdown
              name={name}
              url={url}
              status={status}
              remote={!!remote}
            />
          </div>
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
