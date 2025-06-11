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
import { MoreVertical, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/common/components/ui/input'

import type { WorkloadsWorkload } from '@/common/api/generated'
import { ActionsMcpServer } from './actions-mcp-server'
import { useMutationRestartServerList } from '../hooks/use-mutation-restart-server'
import { useMutationStopServerList } from '../hooks/use-mutation-stop-server'
import { useConfirm } from '@/common/hooks/use-confirm'
import { useDeleteServer } from '../hooks/use-delete-server'

type CardContentMcpServerProps = {
  status: WorkloadsWorkload['status']
  statusContext: WorkloadsWorkload['status_context']
  repoUrl?: string
  name: string
  url: string
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
    <CardContent>
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
  repoUrl,
  url,
}: {
  name: string
  status: WorkloadsWorkload['status']
  statusContext: WorkloadsWorkload['status_context']
  repoUrl?: string
  transport?: string
  url: string
}) {
  const confirm = useConfirm()
  const { mutateAsync: deleteServer, isPending: isDeletePending } =
    useDeleteServer({ name })

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

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(url)
    toast('MCP server URL has been copied to clipboard')
  }

  return (
    <Card className="gap-3 py-5 shadow-none transition-colors">
      <CardHeader>
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
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" role="menu" className="w-80">
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
              <DropdownMenuItem
                onClick={handleRemove}
                disabled={isDeletePending}
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
        repoUrl={repoUrl}
        name={name}
        url={url}
      />
    </Card>
  )
}
