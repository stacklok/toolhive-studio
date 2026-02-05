import { useParams, useSearch } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { Separator } from '@/common/components/ui/separator'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getApiV1BetaWorkloadsByNameLogsOptions,
  getApiV1BetaWorkloadsByNameProxyLogsOptions,
} from '@common/api/generated/@tanstack/react-query.gen'
import { RefreshButton } from '@/common/components/refresh-button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { InputSearch } from '@/common/components/ui/input-search'
import { highlight } from './search'
import { MCP_OPTIMIZER_GROUP_NAME } from '@/common/lib/constants'
import { Skeleton } from '@/common/components/ui/skeleton'

// Generate skeleton counts once to avoid calling Math.random during render
const SKELETON_COUNTS = Array.from(
  { length: 20 },
  () => Math.floor(Math.random() * 6) + 1
)

function SkeletonLogs() {
  return (
    <div
      className="flex w-full flex-col gap-4 p-10"
      data-testid="skeleton-logs"
    >
      {SKELETON_COUNTS.map((numSkeletons, i) => (
        <div key={i} className="flex w-full gap-2">
          <Skeleton className="h-4 w-12 shrink-0" />
          {Array.from({ length: numSkeletons }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function useLogs() {
  const { serverName, groupName } = useParams({
    from: '/logs/$groupName/$serverName',
  })
  const { remote } = useSearch({ from: '/logs/$groupName/$serverName' })
  return useQuery({
    ...(remote
      ? getApiV1BetaWorkloadsByNameProxyLogsOptions({
          path: { name: serverName },
        })
      : getApiV1BetaWorkloadsByNameLogsOptions({ path: { name: serverName } })),

    enabled: !!serverName && !!groupName,
  })
}

export function LogsPage() {
  const { serverName, groupName } = useParams({
    from: '/logs/$groupName/$serverName',
  })
  const [search, setSearch] = useState('')
  const { data: logs, refetch, isFetching, isLoading } = useLogs()
  const isLoadingState = isLoading || isFetching

  const logLines =
    typeof logs === 'string'
      ? logs.split('\n').filter((line) => line.trim())
      : []

  const filteredLogs = search
    ? logLines.filter((line) =>
        line.toLowerCase().includes(search.toLowerCase())
      )
    : logLines

  // Special handling for MCP optimizer group - navigate back to optimizer page
  const backLink =
    groupName === MCP_OPTIMIZER_GROUP_NAME
      ? { to: '/mcp-optimizer' as const }
      : { to: '/group/$groupName' as const, params: { groupName } }

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2">
        <LinkViewTransition {...backLink}>
          <Button
            variant="link"
            aria-label="Back"
            className="text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </LinkViewTransition>
      </div>
      <div className="flex flex-col gap-5">
        <h1
          className="m-0 mb-0 p-0 font-serif text-[34px] leading-[42px]
            font-light tracking-[-0.85px]"
        >
          {groupName === MCP_OPTIMIZER_GROUP_NAME
            ? 'MCP Optimizer'
            : serverName}
        </h1>

        <Separator />
        <div className="mb-4 flex justify-between">
          <InputSearch
            placeholder="Search log"
            value={search}
            onChange={(v) => setSearch(v)}
            aria-label="Search log"
          />

          <RefreshButton refresh={refetch} aria-label="Refresh" />
        </div>
      </div>
      <div
        className="dark:border-secondary dark:bg-card h-[calc(100vh-22rem)]
          overflow-auto rounded-md border bg-white"
      >
        {isLoadingState ? (
          <SkeletonLogs />
        ) : (
          <pre
            className="text-foreground p-5 font-mono text-[13px] leading-[22px]
              font-normal"
          >
            {filteredLogs.length ? (
              filteredLogs.map((line, i) => (
                <span key={i}>
                  {highlight(line, search)}
                  {'\n'}
                </span>
              ))
            ) : (
              <div className="text-muted-foreground">
                {search ? 'No logs match your search' : 'No logs available'}
              </div>
            )}
          </pre>
        )}
      </div>
    </div>
  )
}
