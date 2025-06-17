import { useParams, Link } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function LogsPage() {
  const { serverName } = useParams({ from: '/logs/$serverName' })

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

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
      </div>
      <h1 className="mb-6 text-3xl font-bold">{serverName}</h1>
      <div className="rounded-md border border-gray-200">
        <div className="p-4 font-mono text-[13px] leading-[22px] font-normal text-[#09090B]">
          {mockLogs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
