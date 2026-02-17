import {
  getApiV1BetaWorkloads,
  postApiV1BetaWorkloadsStop,
} from '@common/api/generated/sdk.gen'
import { createClient } from '@common/api/generated/client'
import type { CoreWorkload } from '@common/api/generated/types.gen'
import Store from 'electron-store'
import log from './logger'
import { delay } from '../../utils/delay'
import { getHeaders } from './headers'
import {
  writeShutdownServers,
  clearShutdownServersFromDb,
} from './db/writers/shutdown-writer'
import { readShutdownServers } from './db/readers/shutdown-reader'
import { getFeatureFlag } from './feature-flags/flags'
import { featureFlagKeys } from '../../utils/feature-flags'

// Create a store instance for tracking shutdown servers
const shutdownStore = new Store({
  name: 'server-shutdown',
  defaults: {
    lastShutdownServers: [],
  },
})

/** Create API client for the given port */
function createApiClient(port: number) {
  return createClient({
    baseUrl: `http://localhost:${port}`,
    headers: getHeaders(),
  })
}

/** Get the currently running servers from the ToolHive API. */
async function getRunningServers(
  client: ReturnType<typeof createApiClient>
): Promise<CoreWorkload[]> {
  try {
    const response = await getApiV1BetaWorkloads({
      client,
      query: { all: true },
    })
    if (!response?.data?.workloads) {
      log.info('No workloads data in API response')
      return []
    }
    return response.data.workloads.filter(
      (server: CoreWorkload) => server.status === 'running' && server.name
    )
  } catch (error) {
    log.error('Failed to get running servers: ', error)
    return []
  }
}

/** Get all servers from the ToolHive API. */
async function getAllServers(
  client: ReturnType<typeof createApiClient>
): Promise<CoreWorkload[]> {
  try {
    const response = await getApiV1BetaWorkloads({
      client,
      query: { all: true },
    })
    if (!response?.data?.workloads) {
      log.info('No workloads data in API response')
      return []
    }
    return response.data.workloads.filter((server: CoreWorkload) => server.name)
  } catch (error) {
    log.error('Failed to get all servers: ', error)
    return []
  }
}

/** Poll until all servers are stopped or timeout is reached */
async function pollUntilAllStopped(
  client: ReturnType<typeof createApiClient>,
  serverNames: string[],
  maxAttempts = 20,
  intervalMs = 2000
): Promise<boolean> {
  const finalStatuses = ['stopped', 'error', 'unknown', 'unhealthy']

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await delay(intervalMs)
    }

    try {
      const allServers = await getAllServers(client)
      const trackedServers = allServers.filter((server) =>
        serverNames.includes(server.name || '')
      )

      const serversNotInFinalState = trackedServers.filter(
        (server) => !finalStatuses.includes(server.status || '')
      )

      if (serversNotInFinalState.length === 0) {
        log.info('All servers have reached final state')
        return true
      }

      log.info(
        `Still waiting for ${serversNotInFinalState.length} servers to reach final state: ` +
          serversNotInFinalState.map((s) => `${s.name}(${s.status})`).join(', ')
      )
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
  const client = createApiClient(port)
  const servers = await getRunningServers(client)
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
  try {
    writeShutdownServers(servers)
  } catch (err) {
    log.error('[DB] Failed to dual-write shutdown servers:', err)
  }
  log.info(`Stopping ${servers.length} servers...`)

  const serverNames = servers
    .map((s) => s.name)
    .filter((name): name is string => !!name)

  // Initiate batch stop for all servers
  try {
    await postApiV1BetaWorkloadsStop({
      client,
      body: { names: serverNames },
    })
  } catch (error) {
    log.error('Failed to initiate batch stop: ', error)
    throw error
  }

  // Then poll until all servers are stopped
  const allStopped = await pollUntilAllStopped(client, serverNames)

  if (!allStopped) {
    log.error('Some servers failed to stop within timeout')
    throw new Error('Some servers failed to stop within timeout')
  }

  log.info('All servers stopped cleanly')
}

/** Get the list of servers that were shut down in the last shutdown */
export function getLastShutdownServers(): CoreWorkload[] {
  if (getFeatureFlag(featureFlagKeys.SQLITE_READS_SHUTDOWN)) {
    try {
      return readShutdownServers()
    } catch (err) {
      log.error('[DB] SQLite read failed, falling back to electron-store:', err)
    }
  }
  return shutdownStore.get('lastShutdownServers', [])
}

/** Clear the shutdown history */
export function clearShutdownHistory(): void {
  shutdownStore.set('lastShutdownServers', [])
  try {
    clearShutdownServersFromDb()
  } catch (err) {
    log.error('[DB] Failed to dual-write clear shutdown history:', err)
  }
  log.info('Shutdown history cleared')
}
