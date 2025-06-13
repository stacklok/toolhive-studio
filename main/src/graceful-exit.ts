import { createClient } from '@hey-api/client-fetch'
import {
  getApiV1BetaWorkloads,
  postApiV1BetaWorkloadsByNameStop,
} from '../../renderer/src/common/api/generated/sdk.gen'
import type { WorkloadsWorkload } from '../../renderer/src/common/api/generated/types.gen'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Get the currently running servers from the ToolHive API. */
async function getRunningServers(port: number): Promise<string[]> {
  const client = createClient({ baseUrl: `http://localhost:${port}` })
  try {
    const response = await getApiV1BetaWorkloads({ client })
    if (!response?.data?.workloads) {
      console.warn('No workloads data in API response')
      return []
    }
    return response.data.workloads
      .filter(
        (server: WorkloadsWorkload) =>
          server.status === 'running' && server.name
      )
      .map(({ name }: WorkloadsWorkload) => name as string)
  } catch (error) {
    console.error('Failed to get running servers:', error)
    return []
  }
}

/** Poll until all servers are stopped or timeout is reached */
async function pollUntilAllStopped(
  port: number,
  maxAttempts = 20,
  intervalMs = 2000
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await delay(intervalMs)
    }

    try {
      const runningServers = await getRunningServers(port)
      if (runningServers.length === 0) {
        return true
      }
      console.info(
        `Still waiting for ${runningServers.length} servers to stop...`
      )
    } catch (error) {
      console.error('Error polling server status:', error)
    }
  }
  return false
}

/** Stop every running server in parallel and wait until *all* are down. */
export async function stopAllServers(
  _binPath: string, // Kept for backward compatibility
  port: number
): Promise<void> {
  const client = createClient({ baseUrl: `http://localhost:${port}` })
  const servers = await getRunningServers(port)
  console.info(`Found ${servers.length} running servers:`, servers)

  if (!servers.length) {
    console.info('No running servers – teardown complete')
    return
  }

  console.info(`Stopping ${servers.length} servers…`)

  // First, initiate stop for all servers
  const stopPromises = servers.map(async (name) => {
    try {
      await postApiV1BetaWorkloadsByNameStop({
        client,
        path: { name },
      })
      return name
    } catch (error) {
      console.error(`Failed to initiate stop for server ${name}:`, error)
      throw error
    }
  })

  const results = await Promise.allSettled(stopPromises)
  const failures = results.filter((r) => r.status === 'rejected')
  if (failures.length) {
    throw new Error(`${failures.length} server(s) failed to initiate stop`)
  }

  // Then poll until all servers are stopped
  const allStopped = await pollUntilAllStopped(port)
  if (!allStopped) {
    throw new Error('Some servers failed to stop within timeout')
  }

  console.info('All servers stopped cleanly')
}
