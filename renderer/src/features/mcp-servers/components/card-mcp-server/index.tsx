import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'

import type { CoreWorkload } from '@common/api/generated/types.gen'
import { ActionsMcpServer } from '../actions-mcp-server'
import { useMutationRestartServer } from '../../hooks/use-mutation-restart-server'
import { useMutationStopServerList } from '../../hooks/use-mutation-stop-server'

import { useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { trackEvent } from '@/common/lib/analytics'
import { delay } from '@utils/delay'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/common/components/ui/tooltip'
import { ServerActionsDropdown } from './server-actions'
import { CloudIcon, LaptopIcon } from 'lucide-react'

type CardContentMcpServerProps = {
  status: CoreWorkload['status']
  statusContext: CoreWorkload['status_context']
  name: string
  transport: CoreWorkload['transport_type']
  group?: CoreWorkload['group']
}

function CardContentMcpServer({
  name,
  status,
  transport,
  group,
}: CardContentMcpServerProps) {
  const isRunning = status === 'running'
  const { mutateAsync: restartMutate, isPending: isRestartPending } =
    useMutationRestartServer({
      name,
      group,
    })
  const { mutateAsync: stopMutate, isPending: isStopPending } =
    useMutationStopServerList({
      name,
      group,
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
  group,
}: {
  name: string
  status: CoreWorkload['status']
  statusContext: CoreWorkload['status_context']
  remote?: CoreWorkload['remote']
  url: string
  transport: CoreWorkload['transport_type']
  group?: CoreWorkload['group']
}) {
  const nameRef = useRef<HTMLElement | null>(null)
  const search = useSearch({
    strict: false,
  })
  const [isNewServer, setIsNewServer] = useState(false)
  const searchNewServerName =
    'newServerName' in search ? search.newServerName : null

  useEffect(() => {
    // Check if the server is new by looking for a specific search parameter
    if (searchNewServerName === name) {
      let cancelled = false

      const showNewServerAnimation = async () => {
        setIsNewServer(true)
        await delay(2000)
        if (!cancelled) {
          setIsNewServer(false)
        }
      }

      showNewServerAnimation()

      return () => {
        cancelled = true
      }
    }
  }, [name, searchNewServerName])

  // Check if the server is in deleting state
  const isDeleting = status === 'removing'
  const isTransitioning = status === 'starting' || status === 'stopping'
  const isStopped = status === 'stopped' || status === 'stopping'
  const [hadRecentStatusChange, setHadRecentStatusChange] = useState(false)
  const prevStatusRef = useRef<CoreWorkload['status']>(status)

  useEffect(() => {
    // Show a brief animation for status transitions
    if (
      prevStatusRef.current !== status &&
      ['running'].includes(status ?? '')
    ) {
      let cancelled = false

      const showStatusChangeAnimation = async () => {
        setHadRecentStatusChange(true)
        await delay(2500)
        if (!cancelled) {
          setHadRecentStatusChange(false)
        }
      }

      showStatusChangeAnimation()

      return () => {
        cancelled = true
      }
    }
    prevStatusRef.current = status
  }, [status])

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
            <ServerActionsDropdown
              name={name}
              url={url}
              status={status}
              remote={!!remote}
              group={group}
            />
          </div>
        </div>
      </CardHeader>
      <CardContentMcpServer
        status={status}
        statusContext={statusContext}
        name={name}
        transport={transport}
        group={group}
      />
    </Card>
  )
}
