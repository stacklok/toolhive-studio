import { useParams, Link } from '@tanstack/react-router'
import { Button } from '@/common/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { InputSearch } from '@/common/components/ui/input-search'
import { cn } from '@/common/lib/utils'
import { EmptyState } from '@/common/components/empty-state'
import { IllustrationNoSearchResults } from '@/common/components/illustrations/illustration-no-search-results'
import { IllustrationNoConnection } from '@/common/components/illustrations/illustration-no-connection'

function LogsNavContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <nav
      className={cn(
        `bg-background/50 sticky top-16 z-10 flex h-16 items-center border-b px-6
        shadow-sm backdrop-blur-2xl`,
        className
      )}
    >
      {children}
    </nav>
  )
}

function LogsTitle({ serverName }: { serverName: string }) {
  return (
    <div className="flex items-center gap-4">
      <Button
        size="icon"
        variant="outline"
        aria-label="Back"
        className="text-muted-foreground"
        asChild
      >
        <Link to="/">
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      <div>
        <span className="text-muted-foreground mb-0 block leading-none">
          {serverName}
        </span>
        <h1 className="m-0 text-2xl leading-none font-bold">Logs</h1>
      </div>
    </div>
  )
}

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
    '[2024-03-20 10:00:10] INFO: Scheduled task started',
    '[2024-03-20 10:00:11] INFO: Scheduled task completed successfully',
    '[2024-03-20 10:00:12] INFO: Server shutdown initiated',
    '[2024-03-20 10:00:13] INFO: Server shutdown completed',
    '[2024-03-20 10:00:14] ERROR: Failed to connect to database',
    '[2024-03-20 10:00:15] WARN: High memory usage detected',
    '[2024-03-20 10:00:16] INFO: Memory usage back to normal',
    `[2024-03-20 10:00:17] INFO: Server ${serverName} restarted successfully`,
    '[2024-03-20 10:00:18] INFO: New user registered: user123',
    '[2024-03-20 10:00:19] INFO: User user123 logged in',
    '[2024-03-20 10:00:20] INFO: User user123 logged out',
    '[2024-03-20 10:00:21] INFO: Scheduled backup started',
    '[2024-03-20 10:00:22] INFO: Scheduled backup completed successfully',
    `[2024-03-20 10:00:23] INFO: Server ${serverName} updated to version 1.2.3`,
    '[2024-03-20 10:00:24] INFO: New feature enabled: real-time notifications',
    '[2024-03-20 10:00:25] INFO: Real-time notifications initialized',
    '[2024-03-20 10:00:26] INFO: User user123 subscribed to notifications',
    '[2024-03-20 10:00:27] INFO: Notification sent to user123',
    `[2024-03-20 10:00:28] INFO: Server ${serverName} maintenance mode enabled`,
    `[2024-03-20 10:00:29] INFO: Server ${serverName} maintenance mode disabled`,
    `[2024-03-20 10:00:30] INFO: Server ${serverName} configuration updated`,
    `[2024-03-20 10:00:31] INFO: Server ${serverName} log rotation completed`,
    `[2024-03-20 10:00:32] INFO: Server ${serverName} SSL certificate renewed`,
    `[2024-03-20 10:00:33] INFO: Server ${serverName} security scan completed`,
    `[2024-03-20 10:00:34] INFO: Server ${serverName} security vulnerabilities fixed`,
    `[2024-03-20 10:00:35] INFO: Server ${serverName} performance metrics collected`,
    `[2024-03-20 10:00:36] INFO: Server ${serverName} performance optimization applied`,
    `[2024-03-20 10:00:37] INFO: Server ${serverName} user activity logged`,
    `[2024-03-20 10:00:38] INFO: Server ${serverName} API usage statistics collected`,
    `[2024-03-20 10:00:39] INFO: Server ${serverName} API rate limit applied`,
    `[2024-03-20 10:00:40] INFO: Server ${serverName} API endpoint deprecated`,
    `[2024-03-20 10:00:41] INFO: Server ${serverName} API endpoint updated`,
    `[2024-03-20 10:00:42] INFO: Server ${serverName} API endpoint added`,
    `[2024-03-20 10:00:43] INFO: Server ${serverName} API documentation updated`,
    `[2024-03-20 10:00:44] INFO: Server ${serverName} API authentication method changed`,
    `[2024-03-20 10:00:45] INFO: Server ${serverName} API authorization method changed`,
    `[2024-03-20 10:00:46] INFO: Server ${serverName} API CORS policy updated`,
    `[2024-03-20 10:00:47] INFO: Server ${serverName} API request logging enabled`,
    `[2024-03-20 10:00:48] INFO: Server ${serverName} API response caching enabled`,
    `[2024-03-20 10:00:49] INFO: Server ${serverName} API error handling improved`,
    `[2024-03-20 10:00:50] INFO: Server ${serverName} API versioning implemented`,
    `[2024-03-20 10:00:51] INFO: Server ${serverName} API load balancing configured`,
    `[2024-03-20 10:00:52] INFO: Server ${serverName} started successfully`,
    '[2024-03-20 10:00:53] INFO: Loading configuration...',
    '[2024-03-20 10:00:54] INFO: Configuration loaded successfully',
    '[2024-03-20 10:00:55] INFO: Initializing database connection...',
    '[2024-03-20 10:00:56] INFO: Database connection established',
    '[2024-03-20 10:00:57] INFO: Starting API server...',
    '[2024-03-20 10:00:58] INFO: API server started on port 8080',
    `[2024-03-20 10:00:59] INFO: Server ${serverName} is ready to accept connections`,
    '[2024-03-20 10:01:00] INFO: Health check passed',
    '[2024-03-20 10:01:01] INFO: Monitoring system initialized',
    '[2024-03-20 10:01:02] INFO: Scheduled task started',
    '[2024-03-20 10:01:03] INFO: Scheduled task completed successfully',
    '[2024-03-20 10:01:04] INFO: Server shutdown initiated',
    '[2024-03-20 10:01:05] INFO: Server shutdown completed',
    '[2024-03-20 10:01:06] ERROR: Failed to connect to database',
    '[2024-03-20 10:01:07] WARN: High memory usage detected',
    '[2024-03-20 10:01:08] INFO: Memory usage back to normal',
    `[2024-03-20 10:01:09] INFO: Server ${serverName} restarted successfully`,
    '[2024-03-20 10:01:10] INFO: New user registered: user123',
    '[2024-03-20 10:01:11] INFO: User user123 logged in',
    '[2024-03-20 10:01:12] INFO: User user123 logged out',
    '[2024-03-20 10:01:13] INFO: Scheduled backup started',
    '[2024-03-20 10:01:14] INFO: Scheduled backup completed successfully',
    `[2024-03-20 10:01:15] INFO: Server ${serverName} updated to version 1.2.3`,
    '[2024-03-20 10:01:16] INFO: New feature enabled: real-time notifications',
    '[2024-03-20 10:01:17] INFO: Real-time notifications initialized',
    '[2024-03-20 10:01:18] INFO: User user123 subscribed to notifications',
    '[2024-03-20 10:01:19] INFO: Notification sent to user123',
    `[2024-03-20 10:01:20] INFO: Server ${serverName} maintenance mode enabled`,
    `[2024-03-20 10:01:21] INFO: Server ${serverName} maintenance mode disabled`,
    `[2024-03-20 10:01:22] INFO: Server ${serverName} configuration updated`,
    `[2024-03-20 10:01:23] INFO: Server ${serverName} log rotation completed`,
    `[2024-03-20 10:01:24] INFO: Server ${serverName} SSL certificate renewed`,
    `[2024-03-20 10:01:25] INFO: Server ${serverName} security scan completed`,
    `[2024-03-20 10:01:26] INFO: Server ${serverName} security vulnerabilities fixed`,
    `[2024-03-20 10:01:27] INFO: Server ${serverName} performance metrics collected`,
    `[2024-03-20 10:01:28] INFO: Server ${serverName} performance optimization applied`,
    `[2024-03-20 10:01:29] INFO: Server ${serverName} user activity logged`,
    `[2024-03-20 10:01:30] INFO: Server ${serverName} API usage statistics collected`,
    `[2024-03-20 10:01:31] INFO: Server ${serverName} API rate limit applied`,
    `[2024-03-20 10:01:32] INFO: Server ${serverName} API endpoint deprecated`,
    `[2024-03-20 10:01:33] INFO: Server ${serverName} API endpoint updated`,
    `[2024-03-20 10:01:34] INFO: Server ${serverName} API endpoint added`,
    `[2024-03-20 10:01:35] INFO: Server ${serverName} API documentation updated`,
    `[2024-03-20 10:01:36] INFO: Server ${serverName} API authentication method changed`,
    `[2024-03-20 10:01:37] INFO: Server ${serverName} API authorization method changed`,
    `[2024-03-20 10:01:38] INFO: Server ${serverName} API CORS policy updated`,
    `[2024-03-20 10:01:39] INFO: Server ${serverName} API request logging enabled`,
    `[2024-03-20 10:01:40] INFO: Server ${serverName} API response caching enabled`,
    `[2024-03-20 10:01:41] INFO: Server ${serverName} API error handling improved`,
    `[2024-03-20 10:01:42] INFO: Server ${serverName} API versioning implemented`,
    `[2024-03-20 10:01:43] INFO: Server ${serverName} API load balancing configured`,
  ]

  const filteredLogs = search
    ? mockLogs.filter((line) =>
        line.toLowerCase().includes(search.toLowerCase())
      )
    : mockLogs

  // NOTE: Assuming logs are returned from the API oldest first, it makes
  // sense to scroll the user to the bottom of the logs when they navigate to
  // the route.

  const logContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    logContainerRef.current?.scrollIntoView({
      behavior: 'instant',
      block: 'end',
    })
  }, [search])

  return (
    <>
      <LogsNavContainer>
        <LogsTitle serverName={serverName} />
        <InputSearch
          className="ml-auto" // push to right side
          placeholder="Filter..."
          value={search}
          onChange={(v) => setSearch(v)}
          aria-label="Filter logs"
        />
      </LogsNavContainer>

      {filteredLogs[0] ? (
        <div
          ref={logContainerRef}
          className="text-foreground px-6 py-4 font-mono text-[13px] leading-[22px] font-normal"
        >
          {filteredLogs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            search ? `No logs matching "${search}"` : 'Monitor your MCP Servers'
          }
          body={
            search
              ? 'Try changing, or clearing the filter'
              : 'As you run your MCP Servers, logs will appear here.'
          }
          illustration={
            search ? IllustrationNoSearchResults : IllustrationNoConnection
          }
          actions={
            search
              ? [
                  <Button key="clear" onClick={() => setSearch('')}>
                    Clear Filter
                  </Button>,
                ]
              : null
          }
        />
      )}
    </>
  )
}
