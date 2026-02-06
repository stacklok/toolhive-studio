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
import { useIsServerFromRegistry } from '../../hooks/use-is-server-from-registry'
import { useUpdateVersion } from '../../hooks/use-update-version'
import { CloudIcon, LaptopIcon, ArrowUpCircle } from 'lucide-react'

function UpdateVersionButton({
  serverName,
  registryImage,
  drift,
  disabled,
}: {
  serverName: string
  registryImage: string
  drift: { localTag: string; registryTag: string }
  disabled?: boolean
}) {
  const { promptUpdate, isReady } = useUpdateVersion({
    serverName,
    registryImage,
    localTag: drift.localTag,
    registryTag: drift.registryTag,
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation()
            void promptUpdate()
          }}
          disabled={disabled || !isReady}
          className="hover:bg-accent inline-flex size-9 cursor-pointer
            items-center justify-center rounded-md disabled:pointer-events-none
            disabled:opacity-50"
          aria-label={`Update to ${drift.registryTag}`}
        >
          <ArrowUpCircle className="size-5 text-amber-500" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Update available: {drift.localTag} → {drift.registryTag}
      </TooltipContent>
    </Tooltip>
  )
}

type CardContentMcpServerProps = {
  status: CoreWorkload['status']
  name: string
  transport: CoreWorkload['transport_type']
  group?: CoreWorkload['group']
  drift: { localTag: string; registryTag: string } | null
  registryImage: string | null
}

function CardContentMcpServer({
  name,
  status,
  transport,
  group,
  drift,
  registryImage,
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
          {drift && registryImage && (
            <UpdateVersionButton
              serverName={name}
              registryImage={registryImage}
              drift={drift}
              disabled={`${status}` === 'updating'}
            />
          )}
        </div>
      </div>
    </CardContent>
  )
}

export function CardMcpServer({
  name,
  status,
  url,
  remote,
  transport,
  group,
}: {
  name: string
  status: CoreWorkload['status']
  statusContext?: CoreWorkload['status_context']
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

  const { isFromRegistry, drift, matchedRegistryItem } =
    useIsServerFromRegistry(name)
  const hasUpdate = isFromRegistry && drift

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
              isFromRegistry={!!isFromRegistry}
              drift={drift}
              matchedRegistryItem={matchedRegistryItem}
            />
          </div>
        </div>
      </CardHeader>
      <CardContentMcpServer
        status={status}
        name={name}
        transport={transport}
        group={group}
        drift={hasUpdate ? drift : null}
        registryImage={
          hasUpdate && matchedRegistryItem && 'image' in matchedRegistryItem
            ? (matchedRegistryItem.image ?? null)
            : null
        }
      />
    </Card>
  )
}
