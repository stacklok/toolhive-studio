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
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/common/components/ui/dropdown-menu'
import { Button } from '@/common/components/ui/button'
import { MoreVertical, Trash2, Github, Text, Copy } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Input } from '@/common/components/ui/input'

import type { WorkloadsWorkload } from '@/common/api/generated'
import { ActionsMcpServer } from './actions-mcp-server'
import { useMutationRestartServer } from '../hooks/use-mutation-restart-server'
import { useMutationStopServerList } from '../hooks/use-mutation-stop-server'
import { useConfirm } from '@/common/hooks/use-confirm'
import { useDeleteServer } from '../hooks/use-delete-server'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { getApiV1BetaRegistryByNameServersByServerName } from '@/common/api/generated/sdk.gen'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { trackEvent } from '@/common/lib/analytics'

type CardContentMcpServerProps = {
  status: WorkloadsWorkload['status']
  statusContext: WorkloadsWorkload['status_context']
  name: string
  transport: WorkloadsWorkload['transport_type']
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
  status: WorkloadsWorkload['status']
  statusContext: WorkloadsWorkload['status_context']
  url: string
  transport: WorkloadsWorkload['transport_type']
}) {
  const confirm = useConfirm()
  const { mutateAsync: deleteServer, isPending: isDeletePending } =
    useDeleteServer({ name })

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

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (
      'nativeEvent' in e &&
      typeof e.nativeEvent.stopImmediatePropagation === 'function'
    ) {
      e.nativeEvent.stopImmediatePropagation()
    }
    const result = await confirm(
      `Are you sure you want to remove the server "${name}"?`,
      {
        title: 'Confirm Removal',
        isDestructive: true,
        buttons: { yes: 'Remove', no: 'Cancel' },
      }
    )
    if (result) {
      await deleteServer({ path: { name } })
    }
  }

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

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(url)
    toast('MCP server URL has been copied to clipboard')
  }

  const repositoryUrl = serverDetails?.server?.repository_url

  // Check if the server is in deleting state
  const isDeleting = isDeletePending || status === 'deleting'
  const isTransitioning =
    status === 'starting' || status === 'stopping' || status === 'restarting'
  const isStopped = status === 'stopped' || status === 'stopping'
  const [hadRecentStatusChange, setHadRecentStatusChange] = useState(false)
  const [prevStatus, setPrevStatus] =
    useState<WorkloadsWorkload['status']>(status)

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
              'min-w-0 flex-1 truncate text-xl',
              isStopped && 'text-primary/65'
            )}
          >
            {name}
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
              <div className="flex items-center gap-2 p-2">
                <Input value={url} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  aria-label="Copy URL"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <DropdownMenuSeparator />
              {repositoryUrl && (
                <DropdownMenuItem asChild>
                  <a
                    href={repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex cursor-pointer items-center"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    GitHub Repository
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                asChild
                className="flex cursor-pointer items-center"
              >
                <Link to="/logs/$serverName" params={{ serverName: name }}>
                  <Text className="mr-2 h-4 w-4" />
                  Logs
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRemove}
                disabled={isDeletePending}
                className="flex cursor-pointer items-center"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
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
