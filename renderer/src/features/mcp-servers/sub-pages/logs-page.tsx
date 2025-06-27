import { useParams, Link } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { Separator } from '@/common/components/ui/separator'
import { Input } from '@/common/components/ui/input'
import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsByNameLogsOptions } from '@/common/api/generated/@tanstack/react-query.gen'
import { RefreshButton } from '@/common/components/refresh-button'

export function LogsPage() {
  const { serverName } = useParams({ from: '/logs/$serverName' })
  const [search, setSearch] = useState('')

  const { data: logs, refetch } = useSuspenseQuery({
    ...getApiV1BetaWorkloadsByNameLogsOptions({ path: { name: serverName } }),
  })

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
    <div className="container mx-auto flex max-h-full flex-1 flex-col p-4">
      <div className="mb-2">
        <Link to="/">
          <Button
            variant="ghost"
            aria-label="Back"
            className="text-muted-foreground"
          >
            <ChevronLeft className="mr-1 h-5 w-5" />
            Back
          </Button>
        </Link>
      </div>
      <div className="flex flex-col gap-5">
        <h1 className="m-0 mb-0 p-0 text-3xl font-bold">{serverName}</h1>
        <Separator />
        <div className="flex justify-between">
          <Input
            className="mb-4 w-full max-w-[250px]"
            placeholder="Search log"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search log"
          />

          <RefreshButton refresh={refetch} aria-label="Refresh" />
        </div>
      </div>
      <div className="max-h-full flex-1 overflow-auto rounded-md border">
        <pre className="text-foreground min-h-full p-5 font-mono text-[13px] leading-[22px] font-normal">
          {filteredLogs.length > 0 ? (
            filteredLogs.join('\n')
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
