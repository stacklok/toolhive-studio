import { useParams } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/common/components/ui/card'

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
      <div className="mb-6 flex items-center">
        <h1 className="text-3xl font-semibold">Server Logs</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Logs for {serverName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-black p-4 font-mono text-green-400">
            <pre className="whitespace-pre-wrap">
              {mockLogs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
