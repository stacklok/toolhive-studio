import { useParams } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { Separator } from '@/common/components/ui/separator'
import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsByNameLogsOptions } from '@api/@tanstack/react-query.gen'
import { RefreshButton } from '@/common/components/refresh-button'
import { LinkViewTransition } from '@/common/components/link-view-transition'
import { InputSearch } from '@/common/components/ui/input-search'
import { highlight } from './search'

export function LogsPage() {
  const { serverName, groupName } = useParams({
    from: '/logs/$groupName/$serverName',
  })
  const [search, setSearch] = useState('')

  const { data: logs, refetch } = useSuspenseQuery(
    getApiV1BetaWorkloadsByNameLogsOptions({ path: { name: serverName } })
  )

  const logLines =
    typeof logs === 'string'
      ? logs.split('\n').filter((line) => line.trim())
      : []

  const filteredLogs = search
    ? logLines.filter((line) =>
        line.toLowerCase().includes(search.toLowerCase())
      )
    : logLines

  return (
    <div className="flex max-h-full w-full flex-1 flex-col">
      <div className="mb-2">
        <LinkViewTransition to="/group/$groupName" params={{ groupName }}>
          <Button
            variant="ghost"
            aria-label="Back"
            className="text-muted-foreground"
          >
            <ChevronLeft className="size-5" />
            Back
          </Button>
        </LinkViewTransition>
      </div>
      <div className="flex flex-col gap-5">
        <h1 className="m-0 mb-0 p-0 text-3xl font-bold">{serverName}</h1>
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
      <div className="max-h-full flex-1 overflow-auto rounded-md border">
        <pre
          className="text-foreground min-h-full p-5 font-mono text-[13px]
            leading-[22px] font-normal"
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
      </div>
    </div>
  )
}
