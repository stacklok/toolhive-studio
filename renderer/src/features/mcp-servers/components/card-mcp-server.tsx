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
} from '@/common/components/ui/dropdown-menu'
import { Button } from '@/common/components/ui/button'
import { MoreVertical, Trash2, Github, Text } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import type { WorkloadsWorkload } from '@/common/api/generated'
import { ActionsMcpServer } from './actions-mcp-server'
import { useMutationRestartServerList } from '../hooks/use-mutation-restart-server'
import { useMutationStopServerList } from '../hooks/use-mutation-stop-server'
import { useConfirm } from '@/common/hooks/use-confirm'
import { useDeleteServer } from '../hooks/use-delete-server'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { getApiV1BetaRegistryByNameServersByServerName } from '@/common/api/generated/sdk.gen'
import { isFeatureEnabled } from '@/feature-flags'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

type CardContentMcpServerProps = {
  status: WorkloadsWorkload['status']
  statusContext: WorkloadsWorkload['status_context']
  name: string
}

function CardContentMcpServer({ name, status }: CardContentMcpServerProps) {
  const isRunning = status === 'running'
  const { mutateAsync: restartMutate, isPending: isRestartPending } =
    useMutationRestartServerList({
      name,
    })
  const { mutateAsync: stopMutate, isPending: isStopPending } =
    useMutationStopServerList({
      name,
    })

  return (
    <CardContent className="px-4">
      <div className="flex flex-col gap-4">
        <div className="border-border flex items-center justify-between border-t pt-4">
          <ActionsMcpServer
            status={status}
            isPending={isRestartPending || isStopPending}
            mutate={() => {
              if (isRunning) {
                return stopMutate({
                  path: {
                    name,
                  },
                })
              }

              return restartMutate({
                path: {
                  name,
                },
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
}: {
  name: string
  status: WorkloadsWorkload['status']
  statusContext: WorkloadsWorkload['status_context']
}) {
  const confirm = useConfirm()
  const navigate = useNavigate()
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

  const repositoryUrl = serverDetails?.server?.repository_url

  // Check if the server is in deleting state
  const isDeleting = isDeletePending || status === 'deleting'

  return (
    <Card
      className={twMerge(
        `gap-3 border-none py-4 shadow-none transition-[color,box-shadow,opacity]
        outline-none`,
        isNewServer ? 'ring-2' : undefined,
        isDeleting ? 'pointer-events-none opacity-50' : undefined
      )}
    >
      <CardHeader className="px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl">{name}</CardTitle>
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
            <DropdownMenuContent align="end" role="menu">
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
              {isFeatureEnabled('logs') ? (
                <DropdownMenuItem
                  onClick={() =>
                    navigate({
                      to: '/logs/$serverName',
                      params: { serverName: name },
                    })
                  }
                  className="flex cursor-pointer items-center"
                >
                  <Text className="mr-2 h-4 w-4" />
                  Logs
                </DropdownMenuItem>
              ) : null}
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
      />
    </Card>
  )
}
