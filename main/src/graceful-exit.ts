import { spawn } from 'node:child_process'
import { createClient } from '@hey-api/client-fetch'
import { getApiV1BetaWorkloads } from '../../renderer/src/common/api/generated/sdk.gen'
import type { WorkloadsWorkload } from '../../renderer/src/common/api/generated/types.gen'

/** Get the currently running servers from the ToolHive API. */
async function getRunningServers(port: number): Promise<string[]> {
  const client = createClient({ baseUrl: `http://localhost:${port}` })
  const {
    // @ts-expect-error - wtf
    data: { workloads },
  } = await getApiV1BetaWorkloads({ client })

  return workloads.map(({ name }: WorkloadsWorkload) => name)
}

/** Stop every running server in parallel and wait until *all* are down. */
export async function stopAllServers(
  binPath: string,
  port: number
): Promise<void> {
  const servers = await getRunningServers(port)
  console.info(`Found ${servers.length} running servers:`, servers)

  if (!servers.length) {
    console.info('No running servers – teardown complete')
    return
  }

  console.info(`Stopping ${servers.length} servers…`)

  const stopServer = (name: string) =>
    new Promise<void>((resolve, reject) => {
      const child = spawn(binPath, ['stop', name], { stdio: 'inherit' })
      child.on('exit', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`"thv stop ${name}" exited with code ${code}`))
      )
      child.on('error', reject)
    })

  const results = await Promise.allSettled(servers.map(stopServer))
  const failures = results.filter((r) => r.status === 'rejected')
  failures.forEach((f) =>
    console.error((f as PromiseRejectedResult).reason?.message)
  )
  if (failures.length)
    throw new Error(`${failures.length} server(s) failed to stop`)
  console.info('All servers stopped cleanly')
}
