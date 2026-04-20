import type {
  RegistryImageMetadata,
  RegistryRemoteServerMetadata,
  RegistryGroup,
} from '@common/api/registry-types'
import type { RegistryItem } from '../types'
import { useNavigate } from '@tanstack/react-router'
import { CloudIcon, GitFork, Github, LaptopIcon } from 'lucide-react'
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
import { Badge } from '@/common/components/ui/badge'
import { cn } from '@/common/lib/utils'
import { Stars } from './stars'
import { CardRegistryPromo } from './card-registry-promo'

const PROMO_INDEX = 6

type RegistryServerItem =
  | (RegistryImageMetadata & { type: 'server' })
  | (RegistryRemoteServerMetadata & { type: 'server' })

type RegistryGroupItem = RegistryGroup & { type: 'group' }

function isGroupItem(item: RegistryItem): item is RegistryGroupItem {
  return item.type === 'group'
}

function activateOnKey(e: React.KeyboardEvent, onActivate: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    onActivate()
  }
}

function ServerRow({ server }: { server: RegistryServerItem }) {
  const navigate = useNavigate()
  const isRemote = 'url' in server
  const title = server.title ?? server.name ?? ''
  const stars = server.metadata?.stars
  const repositoryUrl = server.repository_url
  const isDeprecated = server.status === 'deprecated'

  function goToDetail() {
    if (!server.name) return
    void navigate({
      to: '/registry/$name',
      params: { name: server.name },
    })
  }

  return (
    <TableRow
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={goToDetail}
      onKeyDown={(e) => activateOnKey(e, goToDetail)}
      className="cursor-pointer"
    >
      <TableCell className="py-3 font-medium">
        <Tooltip onlyWhenTruncated>
          <TooltipTrigger asChild>
            <span className="block max-w-[260px] truncate">{title}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{title}</TooltipContent>
        </Tooltip>
      </TableCell>

      <TableCell
        className="text-muted-foreground hidden w-full max-w-0 py-3
          md:table-cell"
      >
        {server.description ? (
          <Tooltip onlyWhenTruncated>
            <TooltipTrigger asChild>
              <span className="block truncate text-sm">
                {server.description}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              {server.description}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground/60 text-sm">—</span>
        )}
      </TableCell>

      <TableCell className="text-muted-foreground py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-2 text-sm">
              {isRemote ? (
                <CloudIcon className="size-5" aria-label="Remote MCP server" />
              ) : (
                <LaptopIcon className="size-5" aria-label="Local MCP server" />
              )}
              <span className="capitalize">
                {isRemote ? 'Remote' : 'Local'}
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {isRemote ? 'Remote MCP server' : 'Local MCP server'}
          </TooltipContent>
        </Tooltip>
      </TableCell>

      <TableCell className="py-3">
        {stars ? (
          <Stars stars={stars} />
        ) : (
          <span className="text-muted-foreground/60 text-sm">—</span>
        )}
      </TableCell>

      <TableCell className="py-3">
        {repositoryUrl ? (
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:bg-accent inline-flex size-8
              items-center justify-center rounded-md"
            aria-label="Open repository on GitHub"
          >
            <Github className="size-4" />
          </a>
        ) : null}
      </TableCell>

      <TableCell className="py-3 pr-3">
        {isDeprecated ? (
          <span
            className="border-border text-muted-foreground bg-muted/20
              inline-block rounded-md border px-1.5 py-0.5 text-xs"
          >
            {server.status}
          </span>
        ) : null}
      </TableCell>
    </TableRow>
  )
}

function GroupRow({ group }: { group: RegistryGroupItem }) {
  const navigate = useNavigate()
  const serverCount =
    (group.servers ? Object.keys(group.servers).length : 0) +
    (group.remote_servers ? Object.keys(group.remote_servers).length : 0)

  function goToDetail() {
    if (!group.name) return
    void navigate({
      to: '/registry-group/$name',
      params: { name: group.name },
    })
  }

  return (
    <TableRow
      role="button"
      tabIndex={0}
      aria-label={group.name ?? 'Registry group'}
      onClick={goToDetail}
      onKeyDown={(e) => activateOnKey(e, goToDetail)}
      className="cursor-pointer"
    >
      <TableCell className="py-3 font-medium">
        <div className="flex flex-col gap-1">
          <Tooltip onlyWhenTruncated>
            <TooltipTrigger asChild>
              <span className="block max-w-[260px] truncate">{group.name}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{group.name}</TooltipContent>
          </Tooltip>
          <Badge
            variant="secondary"
            className="bg-foreground/5 w-fit rounded-full px-2.5 py-0.5 text-xs"
          >
            Group
          </Badge>
        </div>
      </TableCell>

      <TableCell
        className="text-muted-foreground hidden w-full max-w-0 py-3
          md:table-cell"
      >
        {group.description ? (
          <Tooltip onlyWhenTruncated>
            <TooltipTrigger asChild>
              <span className="block truncate text-sm">
                {group.description}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              {group.description}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground/60 text-sm">—</span>
        )}
      </TableCell>

      <TableCell className="text-muted-foreground py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-2 text-sm">
              <GitFork className="size-5" aria-label="Group" />
              <span>
                {serverCount} {serverCount === 1 ? 'server' : 'servers'}
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            This group contains {serverCount} MCP{' '}
            {serverCount === 1 ? 'server' : 'servers'}
          </TooltipContent>
        </Tooltip>
      </TableCell>

      <TableCell className="py-3" aria-hidden>
        <span className="text-muted-foreground/60 text-sm">—</span>
      </TableCell>

      <TableCell className="py-3" aria-hidden />

      <TableCell className="py-3 pr-3" aria-hidden />
    </TableRow>
  )
}

function PromoRow() {
  return (
    <TableRow
      data-testid="registry-promo-row"
      className={cn('hover:bg-transparent', 'border-b')}
    >
      <TableCell colSpan={6} className="p-4">
        <CardRegistryPromo />
      </TableCell>
    </TableRow>
  )
}

export function TableRegistry({
  items,
  showPromo,
}: {
  items: RegistryItem[]
  showPromo?: boolean
}) {
  const insertAt = Math.min(PROMO_INDEX, items.length)
  const before = items.slice(0, insertAt)
  const after = items.slice(insertAt)

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p className="text-sm">
          No servers or groups found matching the current filter
        </p>
      </div>
    )
  }

  const renderRow = (item: RegistryItem) =>
    isGroupItem(item) ? (
      <GroupRow key={`group-${item.name}`} group={item} />
    ) : (
      <ServerRow key={`server-${item.name}`} server={item} />
    )

  return (
    <Table containerClassName="rounded-lg border">
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="text-muted-foreground font-medium">
            Name
          </TableHead>
          <TableHead
            className="text-muted-foreground hidden w-full max-w-0 font-medium
              md:table-cell"
          >
            About
          </TableHead>
          <TableHead className="text-muted-foreground w-[150px] font-medium">
            Type
          </TableHead>
          <TableHead className="text-muted-foreground w-[110px] font-medium">
            Stars
          </TableHead>
          <TableHead className="w-12" aria-label="Repository" />
          <TableHead
            className="text-muted-foreground w-[110px] pr-3 font-medium"
          >
            Status
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {before.map(renderRow)}
        {showPromo && <PromoRow />}
        {after.map(renderRow)}
      </TableBody>
    </Table>
  )
}
