import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'
import type { RegistryEnvVar } from '@common/api/registry-types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/common/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'
import { Switch } from '@/common/components/ui/switch'
import { Button } from '@/common/components/ui/button'
import { cn } from '@/common/lib/utils'
import { trackEvent } from '@/common/lib/analytics'
import { ArrowUpCircle, CloudIcon, LaptopIcon } from 'lucide-react'
import { useIsServerFromRegistry } from '../hooks/use-is-server-from-registry'
import { useMutationRestartServer } from '../hooks/use-mutation-restart-server'
import { useMutationStopServerList } from '../hooks/use-mutation-stop-server'
import { useUpdateVersion } from '../hooks/use-update-version'
import { ServerActionsDropdown } from './card-mcp-server/server-actions'

function getStatusText(status: CoreWorkload['status'] | 'restarting') {
  if (status === 'removing') return 'Deleting'
  if (status === 'restarting') return 'Restarting'
  return status
}

function UpdateVersionButton({
  serverName,
  registryImage,
  drift,
  registryEnvVars,
  disabled,
}: {
  serverName: string
  registryImage: string
  drift: { localTag: string; registryTag: string }
  registryEnvVars?: RegistryEnvVar[]
  disabled?: boolean
}) {
  const { promptUpdate, isReady } = useUpdateVersion({
    serverName,
    registryImage,
    localTag: drift.localTag,
    registryTag: drift.registryTag,
    registryEnvVars,
  })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={(e) => {
            e.stopPropagation()
            void promptUpdate('card_button')
          }}
          disabled={disabled || !isReady}
          aria-label={`Update to ${drift.registryTag}`}
        >
          <ArrowUpCircle className="size-5 text-amber-500" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Update available: {drift.localTag} → {drift.registryTag}
      </TooltipContent>
    </Tooltip>
  )
}

function McpServerRow({ mcpServer }: { mcpServer: CoreWorkload }) {
  const name = mcpServer.name ?? ''
  const status = mcpServer.status
  const remote = mcpServer.remote
  const transport = mcpServer.transport_type
  const group = mcpServer.group
  const url = mcpServer.url ?? ''

  const { isFromRegistry, drift, matchedRegistryItem } =
    useIsServerFromRegistry(name)
  const hasUpdate = Boolean(isFromRegistry && drift)

  const registryImage =
    hasUpdate && matchedRegistryItem && 'image' in matchedRegistryItem
      ? (matchedRegistryItem.image ?? null)
      : null
  const registryEnvVars = hasUpdate ? matchedRegistryItem?.env_vars : undefined

  const description =
    matchedRegistryItem?.description ?? mcpServer.package ?? ''

  const isRunning = status === 'running'
  const isStarting = status === 'starting'
  const isStopped = status === 'stopped' || status === 'stopping'
  const isDeleting = status === 'removing'
  const isUpdating = `${status}` === 'updating'

  const { mutateAsync: restartMutate, isPending: isRestartPending } =
    useMutationRestartServer({ name, group })
  const { mutateAsync: stopMutate, isPending: isStopPending } =
    useMutationStopServerList({ name, group })

  const toggleServer = () => {
    if (isRunning) {
      stopMutate({ path: { name } })
      trackEvent(`Workload ${name} stopped`, {
        workload: name,
        transport,
      })
      return
    }
    restartMutate({ path: { name } })
    trackEvent(`Workload ${name} started`, {
      workload: name,
      transport,
    })
  }

  return (
    <TableRow
      className={cn(
        isDeleting && 'pointer-events-none opacity-50',
        isStopped && 'bg-card/65'
      )}
    >
      <TableCell className="py-3 font-medium">
        <Tooltip onlyWhenTruncated>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'block max-w-[260px] truncate',
                isStopped && 'text-foreground/65'
              )}
            >
              {name}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{name}</TooltipContent>
        </Tooltip>
      </TableCell>

      <TableCell
        className="text-muted-foreground hidden w-full max-w-0 py-3
          md:table-cell"
      >
        {description ? (
          <Tooltip onlyWhenTruncated>
            <TooltipTrigger asChild>
              <span className="block truncate text-sm">{description}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">{description}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground/60 text-sm">—</span>
        )}
      </TableCell>

      <TableCell className="py-3 text-right">
        {hasUpdate && drift && registryImage && (
          <UpdateVersionButton
            serverName={name}
            registryImage={registryImage}
            drift={drift}
            registryEnvVars={registryEnvVars}
            disabled={isUpdating || isDeleting}
          />
        )}
      </TableCell>

      <TableCell className="py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Switch
            aria-label="Mutate server"
            checked={isRunning || isStarting}
            disabled={isStarting || isRestartPending || isStopPending}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={toggleServer}
          />
          <span
            className="text-muted-foreground min-w-0 flex-1 truncate text-sm
              capitalize"
          >
            {getStatusText(status)}
          </span>
        </div>
      </TableCell>

      <TableCell className="py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex size-5 items-center justify-center">
              {remote ? (
                <CloudIcon className="size-5" aria-label="Remote MCP server" />
              ) : (
                <LaptopIcon className="size-5" aria-label="Local MCP server" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {remote ? 'Remote MCP server' : 'Local MCP server'}
          </TooltipContent>
        </Tooltip>
      </TableCell>

      <TableCell className="py-3 pr-3 text-right">
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
      </TableCell>
    </TableRow>
  )
}

export function TableMcpServers({
  mcpServers,
}: {
  mcpServers: CoreWorkload[]
}) {
  if (mcpServers.length === 0) {
    return null
  }

  return (
    <Table containerClassName="rounded-lg border">
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="text-muted-foreground font-medium">
            Server
          </TableHead>
          <TableHead
            className="text-muted-foreground hidden w-full max-w-0 font-medium
              md:table-cell"
          >
            About
          </TableHead>
          <TableHead className="w-11" aria-label="Update" />
          <TableHead className="w-[132px]" aria-label="Status" />
          <TableHead className="w-10" aria-label="Type" />
          <TableHead className="w-16 pr-3" aria-label="Actions" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {mcpServers.map((mcpServer) =>
          mcpServer.name ? (
            <McpServerRow key={mcpServer.name} mcpServer={mcpServer} />
          ) : null
        )}
      </TableBody>
    </Table>
  )
}
