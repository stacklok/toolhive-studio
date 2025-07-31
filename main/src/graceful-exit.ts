import {
  getApiV1BetaWorkloads,
  postApiV1BetaWorkloadsByNameStop,
} from '@api/sdk.gen'
import { createClient } from '@api/client'
import type { WorkloadsWorkload } from '@api/types.gen'
import Store from 'electron-store'
import log from './logger'
import { delay } from '../../utils/delay'
import { getAppVersion, isOfficialReleaseBuild } from './util'

// Create a store instance for tracking shutdown servers
const shutdownStore = new Store({
  name: 'server-shutdown',
  defaults: {
    lastShutdownServers: [],
  },
})

function getHeaders() {
  const appVersion = getAppVersion()
  const isReleaseBuild = isOfficialReleaseBuild()
  return {
    'X-Client-Type': 'toolhive-studio',
    'X-Client-Version': appVersion,
    'X-Client-Platform': process.platform,
    'X-Client-Release-Build': isReleaseBuild,
  }
}

/** Get the currently running servers from the ToolHive API. */
async function getRunningServers(port: number): Promise<WorkloadsWorkload[]> {
  const client = createClient({
    baseUrl: `http://localhost:${port}`,
    headers: getHeaders(),
  })
  try {
    const response = await getApiV1BetaWorkloads({ client })
    if (!response?.data?.workloads) {
      log.info('No workloads data in API response')
      return []
    }
    return response.data.workloads.filter(
      (server: WorkloadsWorkload) => server.status === 'running' && server.name
    )
  } catch (error) {
    log.error('Failed to get running servers: ', error)
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
      log.info(`Still waiting for ${runningServers.length} servers to stop...`)
    } catch (error) {
      log.error('Error polling server status: ', error)
    }
  }
  return false
}

/** Stop every running server in parallel and wait until *all* are down. */
export async function stopAllServers(
  _binPath: string, // Kept for backward compatibility
  port: number
): Promise<void> {
  const client = createClient({
    baseUrl: `http://localhost:${port}`,
    headers: getHeaders(),
  })
  const servers = await getRunningServers(port)
  log.info(
    `Found ${servers.length} running servers: `,
    servers.map((item) => item.name)
  )

  if (!servers.length) {
    log.info('No running servers – teardown complete')
    return
  }

  // Store the servers that are about to be shut down
  shutdownStore.set('lastShutdownServers', servers)
  log.info(`Stopping ${servers.length} servers...`)

  // First, initiate stop for all servers
  const stopPromises = servers.map(async (server) => {
    try {
      if (!server.name) return server.name
      await postApiV1BetaWorkloadsByNameStop({
        client,
        path: { name: server.name },
      })
      return server.name
    } catch (error) {
      log.error(`Failed to initiate stop for server ${server.name}: `, error)
      throw error
    }
  })

  const results = await Promise.allSettled(stopPromises)
  const failures = results.filter((r) => r.status === 'rejected')
  if (failures.length) {
    log.error(`${failures.length} server(s) failed to initiate stop`)
    throw new Error(`${failures.length} server(s) failed to initiate stop`)
  }

  // Then poll until all servers are stopped
  const allStopped = await pollUntilAllStopped(port)
  if (!allStopped) {
    log.error('Some servers failed to stop within timeout')
    throw new Error('Some servers failed to stop within timeout')
  }

  log.info('All servers stopped cleanly')
}

/** Get the list of servers that were shut down in the last shutdown */
export function getLastShutdownServers(): string[] {
  return shutdownStore.get('lastShutdownServers', []) as string[]
}

/** Clear the shutdown history */
export function clearShutdownHistory(): void {
  shutdownStore.set('lastShutdownServers', [])
  log.info('Shutdown history cleared')
}
