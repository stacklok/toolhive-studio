import {
  getApiV1BetaWorkloads,
  postApiV1BetaWorkloadsByNameStop,
} from '@api/sdk.gen'
import { createClient } from '@api/client'
import type { CoreWorkload } from '@api/types.gen'
import Store from 'electron-store'
import log from './logger'
import { delay } from '../../utils/delay'
import { getHeaders } from './headers'

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
  const serverNames = servers
    .map((server) => server.name)
    .filter((name): name is string => typeof name === 'string')
  const allStopped = await pollUntilAllStopped(client, serverNames)

  if (!allStopped) {
    log.error('Some servers failed to stop within timeout')
    throw new Error('Some servers failed to stop within timeout')
  }

  log.info('All servers stopped cleanly')
}

/** Get the list of servers that were shut down in the last shutdown */
export function getLastShutdownServers(): string[] {
  return shutdownStore.get('lastShutdownServers', [])
}

/** Clear the shutdown history */
export function clearShutdownHistory(): void {
  shutdownStore.set('lastShutdownServers', [])
  log.info('Shutdown history cleared')
}
