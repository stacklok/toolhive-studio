import { useParams, Link } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { Separator } from '@/common/components/ui/separator'
import { Input } from '@/common/components/ui/input'
import { useState } from 'react'

export function LogsPage() {
  const { serverName } = useParams({ from: '/logs/$serverName' })
  const [search, setSearch] = useState('')

  const mockLogs = [
    `[2024-03-20 10:00:00] INFO: Server ${serverName} started successfully`,
    '[2024-03-20 10:00:01] INFO: Loading configuration...',
    '[2024-03-20 10:00:02] INFO: Configuration loaded successfully',
    '[2024-03-20 10:00:03] INFO: Initializing database connection...',
    '[2024-03-20 10:00:04] INFO: Database connection established',
    '[2024-03-20 10:00:05] INFO: Starting API server...',
    '[2024-03-20 10:00:06] INFO: API server started on port 8080',
    `[2024-03-20 10:00:07] INFO: Server ${serverName} is ready to accept connections`,
    '[2024-03-20 10:00:08] INFO: Health check passed',
    '[2024-03-20 10:00:09] INFO: Monitoring system initialized',
  ]

  const filteredLogs = search
    ? mockLogs.filter((line) =>
        line.toLowerCase().includes(search.toLowerCase())
      )
    : mockLogs

  return (
    <div className="container mx-auto flex flex-1 flex-col p-4">
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
      <h1 className="m-0 mb-6 p-0 text-3xl font-bold">{serverName}</h1>
      <Input
        className="mb-4 w-full max-w-[250px]"
        placeholder="Search log"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search log"
      />
      <Separator />
      <div className="flex-1 overflow-auto rounded-md border border-gray-200">
        <div className="p-5 font-mono text-[13px] leading-[22px] font-normal text-gray-900">
          {filteredLogs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
