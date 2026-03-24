import { getDb, isDbWritable } from '../database'
import { withDbSpan } from '../telemetry'
import type { GithubComStacklokToolhivePkgCoreWorkload as CoreWorkload } from '@common/api/generated/types.gen'

export function writeShutdownServers(servers: CoreWorkload[]): void {
  if (!isDbWritable()) return
  withDbSpan(
    'DB write shutdown servers',
    'db.write',
    { 'db.server_count': servers.length },
    () => {
      const db = getDb()
      db.transaction(() => {
        db.prepare('DELETE FROM shutdown_servers').run()
        const insert = db.prepare(
          'INSERT INTO shutdown_servers (server_data) VALUES (?)'
        )
        for (const server of servers) {
          insert.run(JSON.stringify(server))
        }
      })()
    }
  )
}

export function clearShutdownServersFromDb(): void {
  if (!isDbWritable()) return
  withDbSpan('DB clear shutdown servers', 'db.write', {}, () => {
    const db = getDb()
    db.prepare('DELETE FROM shutdown_servers').run()
  })
}
