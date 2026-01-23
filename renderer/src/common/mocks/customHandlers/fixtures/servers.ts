/**
 * Mock log generator for the logs endpoint.
 * This is a vi.fn() so tests can mock its return value.
 */
export const getMockLogs = vi.fn((serverName: string): string => {
  return `[2025-06-09 15:30:00] INFO: Server ${serverName} started successfully
  [2025-06-09 15:30:01] INFO: Loading configuration...
  [2025-06-09 15:30:02] INFO: Configuration loaded successfully
  [2025-06-09 15:30:03] INFO: Initializing database connection...
  [2025-06-09 15:30:04] INFO: Database connection established
  [2025-06-09 15:30:05] INFO: Starting API server...
  [2025-06-09 15:30:06] INFO: API server started on port 8080
  [2025-06-09 15:30:07] INFO: Server ${serverName} is ready to accept connections
  [2025-06-09 15:30:08] INFO: Health check passed
  [2025-06-09 15:30:09] INFO: Monitoring system initialized`
})
